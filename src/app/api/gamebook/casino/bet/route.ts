// src/app/api/gamebook/casino/bet/route.ts
//
// v3.21 — POST : mise rouge/noir au casino.
// Body : { color: "red" | "black" }
//
// Règles :
//   - Stake fixe : 10 reps
//   - Win = +20 reps (gain net +10), Lose = -10 reps
//   - Probabilité de gagner :
//       * 30 % par défaut
//       * 60 % si le joueur a parlé à LINGUINI aujourd'hui (lastLuckTalkDate === today)
//   - Max 10 paris/jour (reset à minuit via casinoBetsDate)
//   - Doit être sur la map "casino" ou "casino_pepite"
//   - Pas d'EmberCoins, jamais (Q m, décidé par le user)

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isGamebookFrozen } from "@/lib/gamebook/antiCheat"
import { isCreatorAccount, padAvailableEnergyForCreator } from "@/lib/gamebook/creator"
import { readEnergySnapshot, spendEnergyOnSnapshot, grantRewardOnSnapshot, computeAvailableEnergy } from "@/lib/gamebook/energy"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const CASINO_BET_STAKE = 10
const CASINO_BET_WIN = 20   // payout total (incluant le stake retourné)
const CASINO_MAX_BETS_PER_DAY = 10
const CASINO_WIN_PROB_BASE = 0.30
const CASINO_WIN_PROB_LUCKY = 0.60

async function getTodayReps(userId: string): Promise<number> {
    const today = getTodayISO()
    const sets = await prisma.exerciseSet.findMany({
        where: { userId, date: today },
    })
    // v3.23k — 1 sec de gainage = 1/5 énergie (cohérent avec scoring 5s=1pt)
    return sets.reduce((sum: number, s: { exercise: string; reps: number }) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps), 0)
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: Record<string, unknown> = {}
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }
    const color = body.color === "red" || body.color === "black" ? body.color : null
    if (!color) {
        return NextResponse.json({ ok: false, reason: "Choisis rouge ou noir." }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }
    if (isGamebookFrozen(progress as { gamebookFrozenUntil?: Date | null })) {
        return NextResponse.json({ ok: false, reason: "Gamebook gelé.", frozen: true })
    }
    if (progress.mapId !== "casino" && progress.mapId !== "casino_pepite") {
        return NextResponse.json({ ok: false, reason: "Tu n'es pas dans un casino." })
    }

    const today = getTodayISO()

    // Compteur paris jour (reset si autre date)
    const storedBetsDate = (progress as { casinoBetsDate?: string }).casinoBetsDate ?? ""
    const storedBetsToday = (progress as { casinoBetsToday?: number }).casinoBetsToday ?? 0
    const betsToday = storedBetsDate === today ? storedBetsToday : 0

    if (betsToday >= CASINO_MAX_BETS_PER_DAY) {
        return NextResponse.json({
            ok: false,
            reason: `Tu as atteint la limite de ${CASINO_MAX_BETS_PER_DAY} paris pour aujourd'hui. Reviens demain.`,
            betsToday,
            maxBets: CASINO_MAX_BETS_PER_DAY,
        })
    }

    // v4.0 — Énergie dispo INCLUANT bonusSurplus
    const snap = readEnergySnapshot(progress, today)
    const todayReps = await getTodayReps(userId)
    const isCreator = await isCreatorAccount(userId)
    const availableEnergy = padAvailableEnergyForCreator(computeAvailableEnergy(todayReps, snap), isCreator)

    if (availableEnergy < CASINO_BET_STAKE) {
        return NextResponse.json({
            ok: false,
            reason: `Il te faut ${CASINO_BET_STAKE} reps pour miser. Tu en as ${availableEnergy}.`,
            availableEnergy,
        })
    }

    // Roll dice
    const lastLuckDate = (progress as { lastLuckTalkDate?: string }).lastLuckTalkDate ?? ""
    const isLucky = lastLuckDate === today
    const winProb = isLucky ? CASINO_WIN_PROB_LUCKY : CASINO_WIN_PROB_BASE
    const roll = Math.random()
    const won = roll < winProb
    // Couleur tirée : on dérive de roll pour cohérence (mais visible au joueur uniquement)
    const drawnColor = won ? color : (color === "red" ? "black" : "red")

    // v4.0 — Si win : on dépense STAKE puis on crédite WIN au bonusSurplus.
    //        Si lose : on dépense STAKE seul (le reste reste dans le pot du casino).
    const afterStake = spendEnergyOnSnapshot(snap, CASINO_BET_STAKE, today)
    const nextSnap = won ? grantRewardOnSnapshot(afterStake, CASINO_BET_WIN, today) : afterStake
    const newBetsToday = betsToday + 1

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            energySpentToday: nextSnap.energySpentToday,
            energySpentDate: today,
            bonusSurplus: nextSnap.bonusSurplus,
            casinoBetsDate: today,
            casinoBetsToday: newBetsToday,
            lastSeen: new Date(),
        },
    })

    const newAvailable = padAvailableEnergyForCreator(computeAvailableEnergy(todayReps, nextSnap), isCreator)

    return NextResponse.json({
        ok: true,
        won,
        drawnColor,
        playerColor: color,
        isLucky,
        winProb,
        stake: CASINO_BET_STAKE,
        netReps: won ? CASINO_BET_WIN - CASINO_BET_STAKE : -CASINO_BET_STAKE,
        availableEnergy: newAvailable,
        energySpentToday: nextSnap.energySpentToday,
        bonusSurplus: nextSnap.bonusSurplus,
        betsToday: newBetsToday,
        maxBets: CASINO_MAX_BETS_PER_DAY,
    })
}
