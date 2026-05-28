// src/app/api/gamebook/casino/pattern-vegas-spin/route.ts
//
// v3.24b-5 — POST : spin du casino pattern Vegas (22 cases, ×15, 7 patterns/sem).
// Body : { bets: [{ case: 0..21, amount: 20..100 }, ...] }
//
// Le pattern actif dépend du jour de la semaine (Europe/Paris).
// Le streak de wins consécutifs est suivi via casinoPatternVegasStreak,
// avec banqueroute à 5 wins (cooldown 24h).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import {
    CASINO_VEGAS_NUM_CASES,
    CASINO_VEGAS_MIN_BET,
    CASINO_VEGAS_MAX_BET,
    CASINO_VEGAS_WIN_MULTIPLIER,
    CASINO_VEGAS_PATTERN_LENGTH,
    CASINO_BANKRUPT_STREAK,
    CASINO_BANKRUPT_COOLDOWN_HOURS,
    getCasinoVegasPatternForToday,
} from "@/lib/gamebook/casino"
import { getActiveBoost, applyBoostToPayout, consumeBoostPatch } from "@/lib/gamebook/casinoBoost"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

interface VegasBet { case: number; amount: number }

function validateVegasBets(raw: unknown): { ok: true; bets: VegasBet[] } | { ok: false; reason: string } {
    if (!Array.isArray(raw) || raw.length === 0) return { ok: false, reason: "Place au moins une mise." }
    const seen = new Set<number>()
    const out: VegasBet[] = []
    for (const r of raw) {
        if (!r || typeof r !== "object") return { ok: false, reason: "Mise invalide." }
        const caseN = (r as { case?: unknown }).case
        const amount = (r as { amount?: unknown }).amount
        if (typeof caseN !== "number" || !Number.isInteger(caseN) || caseN < 0 || caseN >= CASINO_VEGAS_NUM_CASES) {
            return { ok: false, reason: `Case invalide (0..${CASINO_VEGAS_NUM_CASES - 1}).` }
        }
        if (typeof amount !== "number" || !Number.isInteger(amount) || amount < CASINO_VEGAS_MIN_BET || amount > CASINO_VEGAS_MAX_BET) {
            return { ok: false, reason: `Mise invalide (${CASINO_VEGAS_MIN_BET}-${CASINO_VEGAS_MAX_BET} reps).` }
        }
        if (seen.has(caseN)) return { ok: false, reason: `Déjà misé sur ${caseN}.` }
        seen.add(caseN)
        out.push({ case: caseN, amount })
    }
    return { ok: true, bets: out }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { bets?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const v = validateVegasBets(body.bets)
    if (!v.ok) return NextResponse.json({ ok: false, reason: v.reason }, { status: 400 })
    const bets = v.bets

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    // Cooldown banqueroute
    const bankruptUntil = (progress as { casinoPatternVegasBankruptUntil?: Date | null }).casinoPatternVegasBankruptUntil
    if (bankruptUntil && new Date(bankruptUntil).getTime() > Date.now()) {
        return NextResponse.json({
            ok: false,
            reason: "Tu as fait sauter la banque ! Reviens dans 24h.",
            bankruptUntil,
        })
    }

    const today = getTodayISO()
    // v4.0 — Snapshot énergie incluant bonusSurplus
    const { readEnergySnapshot, spendEnergyOnSnapshot, grantRewardOnSnapshot, computeAvailableEnergy } = await import("@/lib/gamebook/energy")
    const snap = readEnergySnapshot(progress, today)

    const totalBet = bets.reduce((s, b) => s + b.amount, 0)

    const sets = await prisma.exerciseSet.findMany({ where: { userId, date: today } })
    const todayReps = sets.reduce((sum, s) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps), 0)
    const available = computeAvailableEnergy(todayReps, snap)
    if (available < totalBet) {
        return NextResponse.json({ ok: false, reason: `Pas assez de reps : ${available}, ${totalBet} requis.` })
    }

    const spinIndex = (progress as { casinoPatternVegasIndex?: number }).casinoPatternVegasIndex ?? 0
    const pattern = getCasinoVegasPatternForToday()
    const winningCase = pattern[spinIndex % CASINO_VEGAS_PATTERN_LENGTH]

    const winningBet = bets.find((b) => b.case === winningCase)
    const rawWin = winningBet ? winningBet.amount * CASINO_VEGAS_WIN_MULTIPLIER : 0
    const boost = getActiveBoost(progress as any)
    const totalWin = applyBoostToPayout(rawWin, boost)
    const netGain = totalWin - totalBet
    const won = totalWin > 0

    const newStreak = won ? ((progress as { casinoPatternVegasStreak?: number }).casinoPatternVegasStreak ?? 0) + 1 : 0
    const bankrupt = newStreak >= CASINO_BANKRUPT_STREAK
    const newBankruptUntil = bankrupt ? new Date(Date.now() + CASINO_BANKRUPT_COOLDOWN_HOURS * 60 * 60 * 1000) : null
    const newSpinIndex = bankrupt ? 0 : (spinIndex + 1) % CASINO_VEGAS_PATTERN_LENGTH

    // v4.0 — Dépense totalBet puis crédite totalWin au bonusSurplus
    const afterStake = spendEnergyOnSnapshot(snap, totalBet, today)
    const nextSnap = totalWin > 0 ? grantRewardOnSnapshot(afterStake, totalWin, today) : afterStake

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            energySpentToday: nextSnap.energySpentToday,
            energySpentDate: today,
            bonusSurplus: nextSnap.bonusSurplus,
            casinoPatternVegasIndex: newSpinIndex,
            casinoPatternVegasStreak: bankrupt ? 0 : newStreak,
            ...(bankrupt ? { casinoPatternVegasBankruptUntil: newBankruptUntil } : {}),
            ...consumeBoostPatch(),
        },
    })

    return NextResponse.json({
        ok: true,
        won,
        winningCase,
        totalBet,
        totalWin,
        netGain,
        newSpinIndex,
        newWinStreak: bankrupt ? 0 : newStreak,
        bankrupt,
        bankruptUntil: newBankruptUntil,
        message: bankrupt
            ? `🎰💥 BANQUEROUTE ! 5 wins d'affilée. La maison ferme 24h.`
            : won
                ? `🎰 Case ${winningCase} ! Gain : ${totalWin} (net +${netGain}).`
                : `🎰 Case ${winningCase}. Tu perds ${totalBet} reps.`,
    })
}
