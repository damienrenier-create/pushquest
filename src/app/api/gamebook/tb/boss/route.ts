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
        // Défense — devrait être marqué beaten
        await (prisma as any).gamebookProgress.update({
            where: { id: progress.id },
            data: { tbBossBeaten: true },
        })
        return NextResponse.json({
            ok: true,
            justBeaten: true,
            message: "IL CAPO s'incline. « Tu as tout prouvé. L'arène est à toi. »",
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
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            tbBossDefisDone: newDone,
            tbBossBeaten: allDone ? true : false,
        },
    })

    if (allDone) {
        return NextResponse.json({
            ok: true,
            justBeaten: true,
            message: "IL CAPO s'incline lentement. « Tu as TOUT prouvé. L'arène est à toi. Et tes ennemis... mes sbires... ils n'oseront plus. »",
        })
    }

    return NextResponse.json({
        ok: true,
        validated: nextIndex,
        nextIndex: nextIndex + 1,
        nextLabel: DEFI_LABELS[nextIndex + 1],
        message: `IL CAPO hoche la tête. « Défi ${nextIndex + 1} validé. Maintenant : ${DEFI_LABELS[nextIndex + 1]}. »`,
    })
}
