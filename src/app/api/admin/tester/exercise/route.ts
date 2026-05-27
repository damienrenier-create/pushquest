// src/app/api/admin/tester/exercise/route.ts
//
// Panneau testeur — crée un ExerciseSet (reps) pour le compte tester.
// Permet de simuler un entraînement sans devoir vraiment l'encoder dans l'app.
//
// Body : { exercise: "PUSHUP" | "SQUAT" | "PLANK" | "PULLUP" | "CARDIO", reps: number }

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireTester } from "@/lib/admin/requireTester"
import { getTodayISO } from "@/lib/challenge"

export const dynamic = "force-dynamic"

const ALLOWED_EXERCISES = ["PUSHUP", "SQUAT", "PLANK", "PULLUP", "CARDIO"] as const

export async function POST(req: NextRequest) {
    const auth = await requireTester()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const userId = auth.userId

    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { /* empty */ }

    const exercise = typeof body.exercise === "string" ? body.exercise.toUpperCase() : null
    const reps = typeof body.reps === "number" ? Math.floor(body.reps) : null

    if (!exercise || !ALLOWED_EXERCISES.includes(exercise as typeof ALLOWED_EXERCISES[number])) {
        return NextResponse.json({
            ok: false,
            reason: `exercise invalide. Valeurs : ${ALLOWED_EXERCISES.join(", ")}`,
        }, { status: 400 })
    }
    if (reps === null || reps <= 0 || reps > 10000) {
        return NextResponse.json({ ok: false, reason: "reps doit être 1..10000" }, { status: 400 })
    }

    const set = await prisma.exerciseSet.create({
        data: {
            userId,
            exercise,
            reps,
            date: getTodayISO(),
        },
    })

    return NextResponse.json({
        ok: true,
        set: { id: set.id, exercise: set.exercise, reps: set.reps, date: set.date, createdAt: set.createdAt },
    })
}
