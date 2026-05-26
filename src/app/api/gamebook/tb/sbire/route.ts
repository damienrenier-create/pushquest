// src/app/api/gamebook/tb/sbire/route.ts
//
// v3.24c-6 — POST : interaction avec les 3 sbires du bar Team Boulette.
//
// Body : { sbireId: "meowth" | "jessie" | "giovanni" }
//
// Défis :
//   - MEOWTH    : 10 pompes en 5 minutes (chrono via tbBarChallengeData.meowth)
//   - JESSIE    : finir son quota perso du jour
//   - GIOVANNI  : être TOP 1 gainage du jour (PLANK seconds)
//
// Logique :
//   1) Si sbire déjà dans tbBarDefisDone → message "déjà validé"
//   2) Sinon, route délègue à validateXxx() qui :
//      - retourne { ok: true } → on push sbireId dans tbBarDefisDone
//      - retourne { ok: false, reason } → message de progression

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO, getDailyTargetForUserOnDate } from "@/lib/challenge"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const MEOWTH_TARGET = 10            // pompes
const MEOWTH_WINDOW_MS = 5 * 60_000 // 5 minutes

type SbireId = "meowth" | "jessie" | "giovanni"

async function getRepsByExercise(userId: string, dateISO: string): Promise<{
    PUSHUP: number; SQUAT: number; PULLUP: number; PLANK: number; total: number
}> {
    const sets = await prisma.exerciseSet.findMany({ where: { userId, date: dateISO } })
    const r = { PUSHUP: 0, SQUAT: 0, PULLUP: 0, PLANK: 0, total: 0 }
    for (const s of sets) {
        if (s.exercise === "PUSHUP") r.PUSHUP += s.reps
        else if (s.exercise === "SQUAT") r.SQUAT += s.reps
        else if (s.exercise === "PULLUP") r.PULLUP += s.reps
        else if (s.exercise === "PLANK") r.PLANK += s.reps // secondes
        r.total += s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps
    }
    return r
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { sbireId?: string }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }

    const sbireId = body.sbireId as SbireId
    if (!sbireId || !["meowth", "jessie", "giovanni"].includes(sbireId)) {
        return NextResponse.json({ ok: false, reason: "Sbire inconnu." }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    const done: string[] = Array.isArray((progress as { tbBarDefisDone?: unknown }).tbBarDefisDone)
        ? ((progress as { tbBarDefisDone: unknown[] }).tbBarDefisDone as string[])
        : []
    if (done.includes(sbireId)) {
        return NextResponse.json({
            ok: true,
            alreadyDone: true,
            sbireId,
            message: `Ce sbire t'a déjà laissé tranquille.`,
        })
    }

    const today = getTodayISO()

    // ============================================================
    // MEOWTH — 10 pompes en 5 minutes
    // ============================================================
    if (sbireId === "meowth") {
        const challengeData = ((progress as { tbBarChallengeData?: unknown }).tbBarChallengeData ?? {}) as Record<string, { baselinePushups?: number; startedAt?: string }>
        const meowthState = challengeData.meowth

        const reps = await getRepsByExercise(userId, today)

        // Pas encore de chrono : on démarre
        if (!meowthState || !meowthState.startedAt) {
            const newData = { ...challengeData, meowth: { baselinePushups: reps.PUSHUP, startedAt: new Date().toISOString() } }
            await (prisma as any).gamebookProgress.update({
                where: { id: progress.id },
                data: { tbBarChallengeData: newData },
            })
            return NextResponse.json({
                ok: false,
                started: true,
                sbireId,
                target: MEOWTH_TARGET,
                windowMin: 5,
                message: `MEOWTH : "Top chrono. 10 pompes dans 5 minutes. Reviens vite."`,
            })
        }

        // Chrono déjà en cours
        const elapsedMs = Date.now() - new Date(meowthState.startedAt).getTime()
        const delta = reps.PUSHUP - (meowthState.baselinePushups ?? 0)

        if (elapsedMs > MEOWTH_WINDOW_MS) {
            // Expiré → reset baseline pour relance
            const newData = { ...challengeData, meowth: { baselinePushups: reps.PUSHUP, startedAt: new Date().toISOString() } }
            await (prisma as any).gamebookProgress.update({
                where: { id: progress.id },
                data: { tbBarChallengeData: newData },
            })
            return NextResponse.json({
                ok: false,
                started: true,
                expired: true,
                sbireId,
                target: MEOWTH_TARGET,
                message: `MEOWTH ricane : "T'as foiré. On reprend du début. Top chrono."`,
            })
        }

        if (delta >= MEOWTH_TARGET) {
            // Succès
            const newDone = [...done, "meowth"]
            const newData = { ...challengeData }
            delete newData.meowth
            // v3.37 (règle d) — +10 happiness sur défi PNJ réussi
            const { applyHappinessDelta, HAPPINESS_DELTAS } = await import("@/lib/gamebook/happinessChanges")
            const newTam = applyHappinessDelta((progress as { tamagotchi?: unknown }).tamagotchi, HAPPINESS_DELTAS.PNJ_CHALLENGE_WIN)
            await (prisma as any).gamebookProgress.update({
                where: { id: progress.id },
                data: { tbBarDefisDone: newDone, tbBarChallengeData: newData, ...(newTam ? { tamagotchi: newTam } : {}) },
            })
            return NextResponse.json({
                ok: true,
                sbireId,
                message: `MEOWTH grogne, vaincu : "Ouais ouais... t'as gagné cette manche."`,
            })
        }

        const secondsLeft = Math.max(0, Math.ceil((MEOWTH_WINDOW_MS - elapsedMs) / 1000))
        return NextResponse.json({
            ok: false,
            sbireId,
            progress: delta,
            target: MEOWTH_TARGET,
            secondsLeft,
            message: `MEOWTH te toise : "${delta}/${MEOWTH_TARGET} pompes. Il te reste ${Math.ceil(secondsLeft / 60)} min."`,
        })
    }

    // ============================================================
    // JESSIE — finir son quota perso du jour
    // ============================================================
    if (sbireId === "jessie") {
        const reps = await getRepsByExercise(userId, today)
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user) return NextResponse.json({ ok: false, reason: "User not found" }, { status: 400 })
        const personalTarget = getDailyTargetForUserOnDate(user, today)
        if (reps.total >= personalTarget) {
            const newDone = [...done, "jessie"]
            // v3.37 (règle d) — +10 happiness sur défi PNJ réussi
            const { applyHappinessDelta, HAPPINESS_DELTAS } = await import("@/lib/gamebook/happinessChanges")
            const newTam = applyHappinessDelta((progress as { tamagotchi?: unknown }).tamagotchi, HAPPINESS_DELTAS.PNJ_CHALLENGE_WIN)
            await (prisma as any).gamebookProgress.update({
                where: { id: progress.id },
                data: { tbBarDefisDone: newDone, ...(newTam ? { tamagotchi: newTam } : {}) },
            })
            return NextResponse.json({
                ok: true,
                sbireId,
                message: `JESSIE applaudit lentement : "Pas mal. T'as fini ton quota. T'es pas si pourrie."`,
            })
        }
        return NextResponse.json({
            ok: false,
            sbireId,
            progress: reps.total,
            target: personalTarget,
            message: `JESSIE soupire : "Il te manque ${personalTarget - reps.total} reps pour ton quota. Reviens quand t'auras fini."`,
        })
    }

    // ============================================================
    // GIOVANNI — TOP 1 gainage du jour (PLANK seconds)
    // ============================================================
    if (sbireId === "giovanni") {
        // Récupère TOUS les ExerciseSet de today avec exercise=PLANK, agrège par userId
        const allSets = await prisma.exerciseSet.findMany({
            where: { date: today, exercise: "PLANK" },
        })
        const byUser = new Map<string, number>()
        for (const s of allSets) {
            byUser.set(s.userId, (byUser.get(s.userId) ?? 0) + s.reps)
        }
        const myPlank = byUser.get(userId) ?? 0
        let max = 0
        for (const sec of byUser.values()) if (sec > max) max = sec
        const isTop1 = myPlank > 0 && myPlank >= max

        if (isTop1) {
            const newDone = [...done, "giovanni"]
            // v3.37 (règle d) — +10 happiness sur défi PNJ réussi
            const { applyHappinessDelta, HAPPINESS_DELTAS } = await import("@/lib/gamebook/happinessChanges")
            const newTam = applyHappinessDelta((progress as { tamagotchi?: unknown }).tamagotchi, HAPPINESS_DELTAS.PNJ_CHALLENGE_WIN)
            await (prisma as any).gamebookProgress.update({
                where: { id: progress.id },
                data: { tbBarDefisDone: newDone, ...(newTam ? { tamagotchi: newTam } : {}) },
            })
            return NextResponse.json({
                ok: true,
                sbireId,
                myPlank,
                message: `GIOVANNI cesse d'essuyer son verre : "TOP 1 gainage. T'as les tripes. Va voir le boss."`,
            })
        }
        return NextResponse.json({
            ok: false,
            sbireId,
            myPlank,
            topPlank: max,
            message: `GIOVANNI : "Tu fais ${myPlank}s de gainage. Le top fait ${max}s. Pas encore."`,
        })
    }

    return NextResponse.json({ ok: false, reason: "Sbire inconnu." }, { status: 400 })
}
