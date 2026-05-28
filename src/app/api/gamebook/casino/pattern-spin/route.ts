// src/app/api/gamebook/casino/pattern-spin/route.ts
//
// v3.24b — POST : spin de la roulette pattern du casino de Muscuville.
// Body : { bets: [{ case: number, amount: number }, ...] }
//
// Validation :
//   - Au moins 1 mise, max 11 (une par case)
//   - case ∈ [0, 10], amount ∈ [10, 50]
//   - Pas de doublon de case
//   - Le casino n'est pas en banqueroute (sinon cooldown)
//   - Le joueur a assez d'énergie disponible pour couvrir totalBet
//
// Logique :
//   - winningCase = PATTERN[spinIndex % 20]
//   - Pour chaque bet : si case === winningCase → win = amount × 10
//   - totalBet = somme des amounts
//   - totalWin = somme des wins (0 ou amount × 10)
//   - netGain = totalWin - totalBet
//   - energySpentToday += totalBet - totalWin (= -netGain)
//   - spinIndex += 1
//   - Si totalWin > 0 → winStreak += 1, sinon winStreak = 0
//   - Si winStreak >= 5 → banqueroute :
//       → badge "Casseur de banque" (200 XP)
//       → casinoPatternBankruptUntil = now + 24h
//       → reset spinIndex et winStreak à 0

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isCreatorAccount, padAvailableEnergyForCreator } from "@/lib/gamebook/creator"
import { readEnergySnapshot, spendEnergyOnSnapshot, grantRewardOnSnapshot, computeAvailableEnergy } from "@/lib/gamebook/energy"
import {
    CASINO_PATTERN,
    CASINO_PATTERN_LENGTH,
    CASINO_WIN_MULTIPLIER,
    CASINO_BANKRUPT_STREAK,
    CASINO_BANKRUPT_COOLDOWN_HOURS,
    CASINO_BANKRUPT_BADGE_KEY,
    CASINO_BANKRUPT_BADGE_XP,
    validateBets,
} from "@/lib/gamebook/casino"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

async function getTodayReps(userId: string): Promise<number> {
    const today = getTodayISO()
    const sets = await prisma.exerciseSet.findMany({
        where: { userId, date: today },
    })
    // v3.23k — 1 sec de gainage = 1/5 énergie (cohérent avec scoring 5s=1pt)
    return sets.reduce((sum: number, s: { exercise: string; reps: number }) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps), 0)
}

async function awardCasseurBanqueBadge(userId: string): Promise<void> {
    try {
        const def = await (prisma as any).badgeDefinition.findUnique({
            where: { key: CASINO_BANKRUPT_BADGE_KEY },
        })
        if (!def) return
        const existing = await (prisma as any).badgeEvent.findFirst({
            where: {
                badgeKey: CASINO_BANKRUPT_BADGE_KEY,
                toUserId: userId,
                eventType: "UNIQUE_AWARDED",
            },
        })
        if (existing) return
        await (prisma as any).badgeEvent.create({
            data: {
                badgeKey: CASINO_BANKRUPT_BADGE_KEY,
                fromUserId: null,
                toUserId: userId,
                eventType: "UNIQUE_AWARDED",
                previousValue: 0,
                newValue: 1,
                metadata: JSON.stringify({
                    source: "gamebook_casino_pattern_bankruptcy",
                    xpReward: CASINO_BANKRUPT_BADGE_XP,
                }),
            },
        })
        const today = getTodayISO()
        const existingXp = await (prisma as any).xpAdjustment.findFirst({
            where: { userId, reason: "BADGE_CASSEUR_BANQUE" },
        })
        if (!existingXp) {
            await (prisma as any).xpAdjustment.create({
                data: {
                    userId,
                    amount: CASINO_BANKRUPT_BADGE_XP,
                    reason: "BADGE_CASSEUR_BANQUE",
                    date: today,
                },
            })
        }
    } catch (e) {
        console.warn("[casino/pattern-spin] award badge failed", e)
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: Record<string, unknown>
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    const validation = validateBets(body.bets)
    if (!validation.ok) {
        return NextResponse.json({ ok: false, reason: validation.reason }, { status: 400 })
    }
    const bets = validation.bets

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }

    // Banqueroute en cours ?
    const bankruptUntil = (progress as { casinoPatternBankruptUntil?: Date | null }).casinoPatternBankruptUntil ?? null
    if (bankruptUntil && new Date(bankruptUntil).getTime() > Date.now()) {
        return NextResponse.json({
            ok: false,
            reason: "Le casino est en banqueroute. Reviens plus tard.",
            bankruptUntil,
        })
    }

    // v4.0 — Énergie dispo avec bonusSurplus
    const today = getTodayISO()
    const snap = readEnergySnapshot(progress, today)
    const todayReps = await getTodayReps(userId)
    const isCreator = await isCreatorAccount(userId)
    const availableEnergy = padAvailableEnergyForCreator(computeAvailableEnergy(todayReps, snap), isCreator)

    const totalBet = bets.reduce((sum, b) => sum + b.amount, 0)
    if (totalBet > availableEnergy) {
        return NextResponse.json({
            ok: false,
            reason: `Pas assez d'énergie. Il te faut ${totalBet} reps, tu en as ${availableEnergy}.`,
        })
    }

    // Spin
    const spinIndex = (progress as { casinoPatternSpinIndex?: number }).casinoPatternSpinIndex ?? 0
    const winningCase = CASINO_PATTERN[spinIndex % CASINO_PATTERN_LENGTH]
    const winningBet = bets.find((b) => b.case === winningCase)
    const totalWin = winningBet ? winningBet.amount * CASINO_WIN_MULTIPLIER : 0
    const netGain = totalWin - totalBet

    // Update streak + bankrupt check
    const currentStreak = (progress as { casinoPatternWinStreak?: number }).casinoPatternWinStreak ?? 0
    let newStreak: number
    let bankrupt = false
    let newSpinIndex = spinIndex + 1
    let newBankruptUntil: Date | null = null

    if (totalWin > 0) {
        newStreak = currentStreak + 1
        if (newStreak >= CASINO_BANKRUPT_STREAK) {
            bankrupt = true
            newBankruptUntil = new Date(Date.now() + CASINO_BANKRUPT_COOLDOWN_HOURS * 60 * 60 * 1000)
            newSpinIndex = 0
            newStreak = 0
        }
    } else {
        newStreak = 0
    }

    // v4.0 — Dépense totalBet puis crédite totalWin au bonusSurplus.
    const afterStake = spendEnergyOnSnapshot(snap, totalBet, today)
    const nextSnap = totalWin > 0 ? grantRewardOnSnapshot(afterStake, totalWin, today) : afterStake
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            casinoPatternSpinIndex: newSpinIndex,
            casinoPatternWinStreak: newStreak,
            casinoPatternBankruptUntil: bankrupt ? newBankruptUntil : (bankruptUntil ?? null),
            energySpentToday: nextSnap.energySpentToday,
            energySpentDate: today,
            bonusSurplus: nextSnap.bonusSurplus,
            lastSeen: new Date(),
        },
    })

    let badgeAwarded = false
    if (bankrupt) {
        await awardCasseurBanqueBadge(userId)
        badgeAwarded = true
    }

    const newAvailableEnergy = padAvailableEnergyForCreator(computeAvailableEnergy(todayReps, nextSnap), isCreator)

    return NextResponse.json({
        ok: true,
        winningCase,
        totalBet,
        totalWin,
        netGain,
        newSpinIndex,
        newWinStreak: newStreak,
        bankrupt,
        bankruptUntil: newBankruptUntil,
        badgeAwarded,
        // Annonce explicite du badge XP gagné (le client affiche un toast)
        xpAwarded: badgeAwarded ? CASINO_BANKRUPT_BADGE_XP : 0,
        badgeName: badgeAwarded ? "Casseur de banque" : null,
        availableEnergy: newAvailableEnergy,
        energySpentToday: nextSnap.energySpentToday,
        bonusSurplus: nextSnap.bonusSurplus,
    })
}
