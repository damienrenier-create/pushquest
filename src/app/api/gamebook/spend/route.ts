// src/app/api/gamebook/spend/route.ts
//
// POST /api/gamebook/spend
//   body: { amount: number, reason: string }
//
// Débite l'énergie côté serveur. Source de vérité unique pour la consommation.
// Retourne le nouveau availableEnergy après débit.
//
// Reset automatique à minuit : si energySpentDate !== today, on remet à 0 avant débit.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const MAX_SPEND_PER_CALL = 500  // garde-fou anti-abus (jamais plus de 500 reps en une seule requête)

async function getTodayReps(userId: string): Promise<number> {
    const today = getTodayISO()
    const sets = await prisma.exerciseSet.findMany({
        where: { userId, date: today },
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

    const amount = typeof body.amount === "number" ? body.amount : null
    const reason = typeof body.reason === "string" ? body.reason : "unknown"

    if (amount === null || !Number.isFinite(amount) || amount < 0 || amount > MAX_SPEND_PER_CALL) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    const progress = await prisma.gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ error: "No progress" }, { status: 400 })
    }

    const today = getTodayISO()
    const storedDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
    const storedSpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
    const currentSpent = storedDate === today ? storedSpent : 0

    const todayReps = await getTodayReps(userId)
    const availableEnergy = Math.max(0, todayReps - currentSpent)

    // Vérifier qu'il y a assez d'énergie pour le débit
    if (amount > availableEnergy) {
        return NextResponse.json({
            ok: false,
            reason: "Pas assez d'énergie.",
            availableEnergy,
            requested: amount,
        }, { status: 200 })
    }

    // Débiter
    const newSpent = currentSpent + amount
    await prisma.gamebookProgress.update({
        where: { id: progress.id },
        data: {
            energySpentToday: newSpent,
            energySpentDate: today,
            lastSeen: new Date(),
        },
    })

    return NextResponse.json({
        ok: true,
        availableEnergy: todayReps - newSpent,
        energySpentToday: newSpent,
        amount,
        reason,
    })
}
