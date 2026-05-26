// src/app/api/gamebook/tb/validate-challenge/route.ts
//
// v3.24c-4 — POST : valide le défi en cours du videur (200 / 100 / 50 reps).
// Appelé quand le joueur revient parler au videur après avoir fait des reps.
//
// Logique :
//   - Lit videurState et videurChallengeBaseline
//   - Calcule currentTotalReps - baseline = delta
//   - Si delta >= target → set videurState = "passed", retour OK
//   - Sinon → message d'attente
//
// Targets :
//   honest_challenge      → 200 reps
//   honest_pass_pending   → 100 reps
//   lying_pursued         → 50 reps

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

const TARGETS: Record<string, number> = {
    honest_challenge: 200,
    honest_pass_pending: 100,
    lying_pursued: 50,
}

async function getCurrentRepsTotal(userId: string): Promise<number> {
    // v3.23k — 5s gainage = 1 reps (cohérent avec l'énergie)
    const today = getTodayISO()
    const sets = await prisma.exerciseSet.findMany({
        where: { userId, date: today },
    })
    return sets.reduce((sum: number, s: { reps: number; exercise: string }) => {
        return sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps)
    }, 0)
}

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

    const state = (progress as { videurState?: string }).videurState ?? "untouched"
    const baseline = (progress as { videurChallengeBaseline?: number }).videurChallengeBaseline ?? 0

    // Si déjà passé : autorise l'entrée directement
    if (state === "passed" || state === "boss_beaten") {
        return NextResponse.json({
            ok: true,
            state,
            canEnter: true,
            message: "Le videur te reconnaît et te fait signe d'entrer.",
        })
    }

    // Si aucun défi en cours
    if (!(state in TARGETS)) {
        return NextResponse.json({
            ok: false,
            state,
            reason: "Aucun défi en cours. Parle au videur pour choisir ton chemin.",
        })
    }

    const target = TARGETS[state]
    const currentReps = await getCurrentRepsTotal(userId)
    const delta = currentReps - baseline

    if (delta < target) {
        return NextResponse.json({
            ok: false,
            state,
            progress: delta,
            target,
            message: `Le videur te toise. "Il te manque ${target - delta} reps. Reviens quand tu seras prêt."`,
        })
    }

    // Défi accompli → set passed
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { videurState: "passed" },
    })

    const wasPursued = state === "lying_pursued"

    return NextResponse.json({
        ok: true,
        state: "passed",
        canEnter: true,
        wasPursued,
        message: wasPursued
            ? "Le videur sourit, mauvais. \"T'as tenu. Bienvenue. Mais surveille tes arrières...\""
            : "Le videur s'écarte. \"Bien joué. Entre.\"",
    })
}
