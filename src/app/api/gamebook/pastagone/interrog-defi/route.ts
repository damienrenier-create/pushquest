// src/app/api/gamebook/pastagone/interrog-defi/route.ts
//
// v4.0 Phase 4.C — POST : valide un défi d'interrogatoire en cellule Pastagone.
//
// Body : { exercise: "PUSHUP" | "PLANK" | "SQUAT" }
//
// Thresholds (delta réel depuis pastagoneInterrogStart) :
//   - PUSHUP : 50 reps
//   - PLANK  : 300 secondes (somme des reps PLANK = secondes)
//   - SQUAT  : 50 reps
//
// Si le delta dépasse le threshold, on flag pastagoneInterrogDefis[exercise]=true.
// Si les 3 sont validés, on set automatiquement pastagoneEscaped=true.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

const THRESHOLDS: Record<string, number> = {
    PUSHUP: 50,
    PLANK: 300,
    SQUAT: 50,
}

const EXERCISE_TO_KEY: Record<string, "pompes" | "gainage" | "squats"> = {
    PUSHUP: "pompes",
    PLANK: "gainage",
    SQUAT: "squats",
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { exercise?: string }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const ex = (body.exercise ?? "").toUpperCase()
    if (!THRESHOLDS[ex]) {
        return NextResponse.json({ ok: false, reason: "exercise doit être PUSHUP|PLANK|SQUAT" }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    if (progress.pastagoneArrested !== true) {
        return NextResponse.json({ ok: false, reason: "Pas en cellule." }, { status: 403 })
    }
    if (progress.pastagoneEscaped === true) {
        return NextResponse.json({ ok: false, reason: "Déjà évadé." }, { status: 400 })
    }
    const start = progress.pastagoneInterrogStart as Date | null
    if (!start) {
        return NextResponse.json({ ok: false, reason: "Timer interrogatoire absent." }, { status: 400 })
    }

    // Somme du delta réel depuis pastagoneInterrogStart
    const sets = await prisma.exerciseSet.findMany({
        where: {
            userId,
            exercise: ex as "PUSHUP" | "PLANK" | "SQUAT",
            createdAt: { gte: start },
        },
        select: { reps: true },
    })
    const sumReps = sets.reduce((s, r) => s + r.reps, 0)
    const threshold = THRESHOLDS[ex]
    const validated = sumReps >= threshold

    const defisRaw = (progress.pastagoneInterrogDefis ?? {}) as { pompes?: boolean; gainage?: boolean; squats?: boolean }
    const key = EXERCISE_TO_KEY[ex]
    const alreadyValidated = defisRaw[key] === true

    if (!validated) {
        return NextResponse.json({
            ok: false,
            validated: false,
            delta: sumReps,
            threshold,
            message: `${sumReps} ${ex.toLowerCase()} sur ${threshold}. Continue.`,
        })
    }
    if (alreadyValidated) {
        return NextResponse.json({
            ok: true,
            validated: true,
            already: true,
            delta: sumReps,
            threshold,
            defis: defisRaw,
            escaped: progress.pastagoneEscaped === true,
            message: `${ex} déjà validé.`,
        })
    }

    const newDefis = { ...defisRaw, [key]: true }
    const allValidated = newDefis.pompes === true && newDefis.gainage === true && newDefis.squats === true

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            pastagoneInterrogDefis: newDefis,
            ...(allValidated ? { pastagoneEscaped: true } : {}),
        },
    })

    return NextResponse.json({
        ok: true,
        validated: true,
        already: false,
        delta: sumReps,
        threshold,
        defis: newDefis,
        escaped: allValidated,
        message: allValidated
            ? "Les 3 défis validés. Le flic CARBONE déverrouille la porte de la cellule. « Sors. Et que je te revoie pas. »"
            : `${ex} validé (${sumReps}/${threshold}).`,
    })
}
