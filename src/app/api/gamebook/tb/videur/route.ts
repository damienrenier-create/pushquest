// src/app/api/gamebook/tb/videur/route.ts
//
// v3.24c-3 — POST : interaction avec le PORTIER ARRABBIATA (videur du bar Team Boulette).
//
// Body : { choice: "no" | "yes_honest" | "yes_lying" }
//   - "no"          → défi 200 reps en 24h, si réussi → passage libre à vie
//   - "yes_honest"  → vérifie pereTalked. Si oui : défi 100 reps puis passage.
//                                          Si non : le joueur a menti (= yes_lying).
//   - "yes_lying"   → défi 50 reps puis passage, MAIS lâche les sbires (malus -10 par parole)
//
// State machine videurState :
//   "untouched"          → état initial
//   "honest_challenge"   → défi 200 reps (= a dit "non")
//   "honest_pass_pending"→ défi 100 reps en cours (= a dit "oui_honest" avec flag pere)
//   "lying_pursued"      → défi 50 reps en cours + sbires lâchés
//   "passed"             → entrée libre au bar (a passé un des 3 défis)
//   "boss_beaten"        → boss vaincu, sbires neutralisés

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

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

    const choice = body.choice
    if (choice !== "no" && choice !== "yes_honest" && choice !== "yes_lying") {
        return NextResponse.json({ ok: false, reason: "Choix invalide." }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    const currentState = (progress as { videurState?: string }).videurState ?? "untouched"

    // Si déjà passé, on laisse passer directement
    if (currentState === "passed" || currentState === "boss_beaten") {
        return NextResponse.json({
            ok: true,
            state: currentState,
            message: "Le videur te reconnaît et te laisse entrer.",
            canEnter: true,
        })
    }

    const pereTalked = (progress as { pereTalked?: boolean }).pereTalked === true

    // Snapshot des reps du jour pour le défi (les reps actuels = baseline)
    const today = new Date().toISOString().slice(0, 10)
    const sets = await prisma.exerciseSet.findMany({ where: { userId, date: today } })
    const baselineReps = sets.reduce((sum, s) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps), 0)

    let newState: string
    let target: number
    let message: string
    let pursued = false

    if (choice === "no") {
        // Défi honnête 200 reps
        newState = "honest_challenge"
        target = 200
        message = "Le videur grogne. \"Bien. Alors prouve-toi : 200 reps en 24h. Reviens quand t'es prêt.\""
    } else if (choice === "yes_honest" && pereTalked) {
        // Mot de passe valide → défi 100 reps
        newState = "honest_pass_pending"
        target = 100
        message = "Le videur s'incline légèrement. \"Le Père Pesto t'a parlé. Bien. 100 reps, et tu passes.\""
    } else {
        // yes_lying OU yes_honest sans flag pere (= menteur)
        newState = "lying_pursued"
        target = 50
        pursued = true
        message = "Le videur ricane. \"Tu mens. Mais bon, t'as du cran. 50 reps, et je te laisse passer... mais mes hommes te trouveront.\""
    }

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            videurState: newState,
            videurChallengeBaseline: baselineReps,
            videurChallengeStartedAt: new Date(),
        },
    })

    return NextResponse.json({
        ok: true,
        state: newState,
        target,
        baselineReps,
        message,
        pursued,
        canEnter: false,
    })
}
