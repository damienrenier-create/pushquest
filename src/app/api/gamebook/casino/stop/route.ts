// src/app/api/gamebook/casino/stop/route.ts
//
// v3.24b-2 — POST : "Stop ou encore" (3 essais/jour, mise 1-20, random crash).
// Body :
//   - { action: "start", stake: 1..20 } → débite stake, retourne sessionId
//   - { action: "continue" } → 30% crash, sinon pot × 1.5
//   - { action: "cashout" } → crédite le pot courant
//
// État de session côté serveur via tbBarChallengeData (réutilisé) :
// stopSession: { stake, currentPot, multiplier, alive: bool }

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { getActiveBoost, applyBoostToPayout, consumeBoostPatch } from "@/lib/gamebook/casinoBoost"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const MAX_PLAYS_PER_DAY = 3
const CRASH_PROB = 0.3
const MULT_PER_STEP = 1.5

interface StopSession {
    stake: number
    currentPot: number
    step: number
    alive: boolean
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { action?: string; stake?: number }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const action = body.action
    if (!action || !["start", "continue", "cashout"].includes(action)) {
        return NextResponse.json({ ok: false, reason: "action invalide." }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    const today = getTodayISO()
    const storedDate = (progress as { stopOuEncoreDate?: string }).stopOuEncoreDate ?? ""
    const playsToday = storedDate === today ? ((progress as { stopOuEncorePlaysToday?: number }).stopOuEncorePlaysToday ?? 0) : 0

    // Lecture de l'état de session (stocké dans tbBarChallengeData.stopSession)
    const challengeData = ((progress as { tbBarChallengeData?: unknown }).tbBarChallengeData ?? {}) as Record<string, unknown>
    const currentSession: StopSession | null = (challengeData.stopSession as StopSession | undefined) ?? null

    // v4.0 — Snapshot énergie incluant bonusSurplus
    const { readEnergySnapshot, spendEnergyOnSnapshot, grantRewardOnSnapshot, computeAvailableEnergy } = await import("@/lib/gamebook/energy")
    const snap = readEnergySnapshot(progress, today)

    if (action === "start") {
        if (playsToday >= MAX_PLAYS_PER_DAY) {
            return NextResponse.json({ ok: false, reason: "Tu as épuisé tes 3 essais du jour." })
        }
        if (currentSession?.alive) {
            return NextResponse.json({ ok: false, reason: "Une session est déjà en cours. Continue ou cash-out d'abord." })
        }
        const stake = Math.max(1, Math.min(20, Math.floor(body.stake ?? 1)))
        const sets = await prisma.exerciseSet.findMany({ where: { userId, date: today } })
        const todayReps = sets.reduce((sum, s) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps), 0)
        const available = computeAvailableEnergy(todayReps, snap)
        if (available < stake) {
            return NextResponse.json({ ok: false, reason: `Pas assez de reps : ${available} dispo, ${stake} requis.` })
        }
        const newSession: StopSession = { stake, currentPot: stake, step: 0, alive: true }
        const newData = { ...challengeData, stopSession: newSession }
        const nextSnap = spendEnergyOnSnapshot(snap, stake, today)
        await (prisma as any).gamebookProgress.update({
            where: { id: progress.id },
            data: {
                energySpentToday: nextSnap.energySpentToday,
                energySpentDate: today,
                bonusSurplus: nextSnap.bonusSurplus,
                tbBarChallengeData: newData,
                stopOuEncoreDate: today,
                stopOuEncorePlaysToday: playsToday + 1,
            },
        })
        return NextResponse.json({
            ok: true,
            session: newSession,
            playsLeft: MAX_PLAYS_PER_DAY - playsToday - 1,
            message: `Tu mises ${stake} reps. Le pot est de ${stake}. Continue ou cash-out ?`,
        })
    }

    if (action === "continue") {
        if (!currentSession?.alive) {
            return NextResponse.json({ ok: false, reason: "Pas de session en cours. Démarre d'abord." })
        }
        const crash = Math.random() < CRASH_PROB
        if (crash) {
            const dead: StopSession = { ...currentSession, alive: false, currentPot: 0 }
            const newData = { ...challengeData, stopSession: dead }
            // v3.37 (règle f6) — CRASH déçoit l'animal : -3 happiness
            const { applyHappinessDelta, HAPPINESS_DELTAS } = await import("@/lib/gamebook/happinessChanges")
            const newTam = applyHappinessDelta((progress as { tamagotchi?: unknown }).tamagotchi, HAPPINESS_DELTAS.STOP_CRASH)
            await (prisma as any).gamebookProgress.update({
                where: { id: progress.id },
                data: {
                    tbBarChallengeData: newData,
                    ...(newTam ? { tamagotchi: newTam } : {}),
                },
            })
            return NextResponse.json({
                ok: true,
                crashed: true,
                session: dead,
                message: `💥 CRASH ! Tu perds le pot de ${currentSession.currentPot} reps.`,
            })
        }
        const newPot = Math.round(currentSession.currentPot * MULT_PER_STEP)
        const updated: StopSession = { ...currentSession, currentPot: newPot, step: currentSession.step + 1 }
        const newData = { ...challengeData, stopSession: updated }
        await (prisma as any).gamebookProgress.update({
            where: { id: progress.id },
            data: { tbBarChallengeData: newData },
        })
        return NextResponse.json({
            ok: true,
            session: updated,
            message: `Le pot monte à ${newPot} reps. Encore ou stop ?`,
        })
    }

    // cashout
    if (!currentSession?.alive) {
        return NextResponse.json({ ok: false, reason: "Pas de session en cours." })
    }
    const boost = getActiveBoost(progress as any)
    const boostedPot = applyBoostToPayout(currentSession.currentPot, boost)
    // v4.0 — Crédit le pot boosté dans bonusSurplus (gain en énergie réutilisable)
    const nextSnap = grantRewardOnSnapshot(snap, boostedPot, today)
    const dead: StopSession = { ...currentSession, alive: false }
    const newData = { ...challengeData, stopSession: dead }
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            energySpentToday: nextSnap.energySpentToday,
            energySpentDate: today,
            bonusSurplus: nextSnap.bonusSurplus,
            tbBarChallengeData: newData,
            ...consumeBoostPatch(),
        },
    })
    const boostNote = boost !== 0 ? ` (croupier ${boost > 0 ? "+" : ""}${boost}%)` : ""
    return NextResponse.json({
        ok: true,
        cashedOut: true,
        amount: boostedPot,
        boost,
        message: `💰 Tu encaisses ${boostedPot} reps. Net : +${boostedPot - currentSession.stake} reps${boostNote}.`,
    })
}
