// src/app/api/gamebook/tb/boss/route.ts
//
// v3.24c-7 — POST : interaction avec IL CAPO (boss Team Boulette).
//
// Les défis sont ordonnés et débloqués un par un (le suivant n'est annoncé
// que lorsque le précédent est validé) :
//   d1 — TOP 1 squat du jour
//   d2 — TOP 1 pompes du jour
//   d3 — TOP 1 reps total hier (figé : on regarde le leaderboard d'hier)
//   d4 — TOP 1 reps total aujourd'hui (en + de d3 déjà validé hier)
//
// À chaque talk, on regarde le prochain défi à valider (= tbBossDefisDone.length).
// Si la condition est OK → on push dans tbBossDefisDone + dialogue suivant.
// Sinon → message d'attente.
// Si les 4 défis sont done → tbBossBeaten = true + dialogue de défaite finale.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO, getYesterdayISO } from "@/lib/challenge"
import { addItem } from "@/lib/gamebook/inventory"
import type { InventoryEntry } from "@/lib/gamebook/inventory"

const SERUM_REPS_REWARD = 1000

async function applyBossRewards(progressId: string, currentInventory: unknown): Promise<InventoryEntry[]> {
    const inv: InventoryEntry[] = Array.isArray(currentInventory) ? (currentInventory as InventoryEntry[]) : []
    const newInv = addItem(inv, "mega_gourde")
    await (prisma as any).gamebookProgress.update({
        where: { id: progressId },
        data: {
            tbBossBeaten: true,
            tbRewardClaimed: true,
            serumIntelligenceReps: { increment: SERUM_REPS_REWARD },
            arenaUnlocked: true,
            inventory: newInv,
        },
    })
    return newInv
}

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

type Exercise = "PUSHUP" | "SQUAT" | "PULLUP" | "PLANK"

async function getLeaderboardForExerciseOnDate(exercise: Exercise, dateISO: string): Promise<Map<string, number>> {
    const sets = await prisma.exerciseSet.findMany({ where: { date: dateISO, exercise } })
    const m = new Map<string, number>()
    for (const s of sets) m.set(s.userId, (m.get(s.userId) ?? 0) + s.reps)
    return m
}

async function getTotalRepsLeaderboardOnDate(dateISO: string): Promise<Map<string, number>> {
    const sets = await prisma.exerciseSet.findMany({ where: { date: dateISO } })
    const m = new Map<string, number>()
    for (const s of sets) {
        const energy = s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps
        m.set(s.userId, (m.get(s.userId) ?? 0) + energy)
    }
    return m
}

function isTop1(myValue: number, board: Map<string, number>): boolean {
    if (myValue <= 0) return false
    let max = 0
    for (const v of board.values()) if (v > max) max = v
    return myValue >= max
}

const DEFI_LABELS = [
    "TOP 1 squat du jour",
    "TOP 1 pompes du jour",
    "TOP 1 reps total d'hier",
    "TOP 1 reps total aujourd'hui (en plus d'hier)",
]

export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    const beaten = (progress as { tbBossBeaten?: boolean }).tbBossBeaten === true
    if (beaten) {
        return NextResponse.json({
            ok: true,
            alreadyBeaten: true,
            message: "IL CAPO incline la tête. « Tu as gagné. L'arène est à toi. Va. »",
        })
    }

    const done: string[] = Array.isArray((progress as { tbBossDefisDone?: unknown }).tbBossDefisDone)
        ? ((progress as { tbBossDefisDone: unknown[] }).tbBossDefisDone as string[])
        : []
    const nextIndex = done.length // 0..3

    if (nextIndex >= 4) {
        // Défense — devrait être marqué beaten + appliquer la récompense si pas déjà fait
        const rewardClaimed = (progress as { tbRewardClaimed?: boolean }).tbRewardClaimed === true
        if (!rewardClaimed) {
            await applyBossRewards(progress.id, (progress as { inventory?: unknown }).inventory)
        } else {
            await (prisma as any).gamebookProgress.update({
                where: { id: progress.id },
                data: { tbBossBeaten: true },
            })
        }
        return NextResponse.json({
            ok: true,
            justBeaten: true,
            message: rewardClaimed
                ? "IL CAPO incline la tête. « L'arène est à toi. »"
                : `IL CAPO s'incline. « Tu as tout prouvé. Voici la Mega Gourde du Capo. L'arène est à toi. Mes sbires ne t'embêteront plus. » (+1 Mega Gourde, +${SERUM_REPS_REWARD} reps de sérum intelligence)`,
        })
    }

    const today = getTodayISO()
    const yesterday = getYesterdayISO()

    let success = false
    let progressMsg = ""

    if (nextIndex === 0) {
        const board = await getLeaderboardForExerciseOnDate("SQUAT", today)
        const my = board.get(userId) ?? 0
        success = isTop1(my, board)
        let max = 0; for (const v of board.values()) if (v > max) max = v
        progressMsg = `Tu fais ${my} squats. TOP : ${max}.`
    } else if (nextIndex === 1) {
        const board = await getLeaderboardForExerciseOnDate("PUSHUP", today)
        const my = board.get(userId) ?? 0
        success = isTop1(my, board)
        let max = 0; for (const v of board.values()) if (v > max) max = v
        progressMsg = `Tu fais ${my} pompes. TOP : ${max}.`
    } else if (nextIndex === 2) {
        const board = await getTotalRepsLeaderboardOnDate(yesterday)
        const my = board.get(userId) ?? 0
        success = isTop1(my, board)
        let max = 0; for (const v of board.values()) if (v > max) max = v
        progressMsg = `Hier tu as fait ${my} reps. TOP d'hier : ${max}.`
    } else if (nextIndex === 3) {
        const board = await getTotalRepsLeaderboardOnDate(today)
        const my = board.get(userId) ?? 0
        success = isTop1(my, board)
        let max = 0; for (const v of board.values()) if (v > max) max = v
        progressMsg = `Aujourd'hui tu fais ${my} reps. TOP : ${max}.`
    }

    if (!success) {
        return NextResponse.json({
            ok: false,
            nextIndex,
            label: DEFI_LABELS[nextIndex],
            message: `IL CAPO te scrute. « Défi ${nextIndex + 1} : ${DEFI_LABELS[nextIndex]}. ${progressMsg} »`,
        })
    }

    // Succès
    const newDone = [...done, `d${nextIndex + 1}`]
    const allDone = newDone.length >= 4

    if (allDone) {
        // Marquer done + appliquer la récompense (mega gourde + sérum + arène)
        await (prisma as any).gamebookProgress.update({
            where: { id: progress.id },
            data: { tbBossDefisDone: newDone },
        })
        await applyBossRewards(progress.id, (progress as { inventory?: unknown }).inventory)
        return NextResponse.json({
            ok: true,
            justBeaten: true,
            rewards: { item: "mega_gourde", serumReps: SERUM_REPS_REWARD, arenaUnlocked: true },
            message: `IL CAPO s'incline lentement. « Tu as TOUT prouvé. Voici la Mega Gourde du Capo, marque de mon respect. L'arène est à toi. Et mes sbires... ils n'oseront plus. » (+1 Mega Gourde, +${SERUM_REPS_REWARD} reps de sérum intelligence)`,
        })
    }

    // v3.37 (règle d) — +10 happiness sur défi PNJ réussi (chaque palier IL CAPO)
    const { applyHappinessDelta, HAPPINESS_DELTAS } = await import("@/lib/gamebook/happinessChanges")
    const newTam = applyHappinessDelta((progress as { tamagotchi?: unknown }).tamagotchi, HAPPINESS_DELTAS.PNJ_CHALLENGE_WIN)

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { tbBossDefisDone: newDone, ...(newTam ? { tamagotchi: newTam } : {}) },
    })

    return NextResponse.json({
        ok: true,
        validated: nextIndex,
        nextIndex: nextIndex + 1,
        nextLabel: DEFI_LABELS[nextIndex + 1],
        message: `IL CAPO hoche la tête. « Défi ${nextIndex + 1} validé. Maintenant : ${DEFI_LABELS[nextIndex + 1]}. »`,
    })
}
