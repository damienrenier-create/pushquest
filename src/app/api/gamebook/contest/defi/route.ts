// src/app/api/gamebook/contest/defi/route.ts
//
// v3.23c-2 — POST : valide un défi d'un des 3 PNJ du contest_hall (Muscuville).
// Body : { pnjId: "pompator" | "squatilus" | "tiroir" }
//
// Validation :
//   - Le joueur doit avoir le sommet du Mont (montSummitReached === true)
//   - Le défi correspondant ne doit pas être déjà complété
//   - L'exercice du jour doit atteindre le seuil :
//       - POMPATOR  : 200 PUSHUP
//       - SQUATILUS : 250 SQUAT
//       - TIROIR    : 30 PULLUP
//
// Récompense : +100 reps (soustrait d'energySpentToday) + flag à true.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isCreatorAccount, padAvailableEnergyForCreator } from "@/lib/gamebook/creator"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const DEFI_REWARD_REPS = 100

const DEFIS = {
    pompator:  { flag: "contestDefiPompatorDone",  exercise: "PUSHUP", threshold: 200, label: "pompes" },
    squatilus: { flag: "contestDefiSquatilusDone", exercise: "SQUAT",  threshold: 250, label: "squats" },
    tiroir:    { flag: "contestDefiTiroirDone",    exercise: "PULLUP", threshold: 30,  label: "tractions" },
} as const

type PnjId = keyof typeof DEFIS

async function getTodayExerciseTotal(userId: string, exercise: string): Promise<number> {
    const today = getTodayISO()
    const sets = await prisma.exerciseSet.findMany({
        where: { userId, date: today, exercise },
    })
    return sets.reduce((sum: number, s: { reps: number }) => sum + s.reps, 0)
}

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

    const pnjId = body.pnjId as PnjId
    if (!pnjId || !(pnjId in DEFIS)) {
        return NextResponse.json({ ok: false, reason: "pnjId invalide." }, { status: 400 })
    }
    const config = DEFIS[pnjId]

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }

    // Gating sommet du Mont
    if ((progress as { montSummitReached?: boolean }).montSummitReached !== true) {
        return NextResponse.json({
            ok: false,
            reason: "Tu dois d'abord conquérir le Mont Pasta-Ventoux.",
        })
    }

    // Déjà complété ?
    if ((progress as Record<string, unknown>)[config.flag] === true) {
        return NextResponse.json({
            ok: false,
            alreadyDone: true,
            reason: "Tu as déjà relevé ce défi.",
        })
    }

    // Vérifier le seuil
    const total = await getTodayExerciseTotal(userId, config.exercise)
    if (total < config.threshold) {
        return NextResponse.json({
            ok: false,
            reason: `Il faut ${config.threshold} ${config.label} aujourd'hui. T'en as ${total}.`,
            required: config.threshold,
            current: total,
        })
    }

    // OK : grant
    const today = getTodayISO()
    const storedDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
    const storedSpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
    const currentSpent = storedDate === today ? storedSpent : 0
    const newSpent = currentSpent - DEFI_REWARD_REPS

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            [config.flag]: true,
            energySpentToday: newSpent,
            energySpentDate: today,
            lastSeen: new Date(),
        },
    })

    const todayReps = await getTodayExerciseTotal(userId, "PUSHUP")
        + await getTodayExerciseTotal(userId, "SQUAT")
        + await getTodayExerciseTotal(userId, "PULLUP")
        + await getTodayExerciseTotal(userId, "PLANK")
    const isCreator = await isCreatorAccount(userId)
    const availableEnergy = padAvailableEnergyForCreator(todayReps - newSpent, isCreator)

    return NextResponse.json({
        ok: true,
        pnjId,
        reward: DEFI_REWARD_REPS,
        availableEnergy,
        energySpentToday: newSpent,
    })
}
