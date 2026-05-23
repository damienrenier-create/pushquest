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
import { isGamebookFrozen } from "@/lib/gamebook/antiCheat"
import { parseInventory, wearItem, hasIntactItem } from "@/lib/gamebook/inventory"

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
    // v3.8.1 — si wearBoots=true et que l'user a les baskets intactes, on décrémente leur durabilité
    const wearBoots = body.wearBoots === true

    if (amount === null || !Number.isFinite(amount) || amount < 0 || amount > MAX_SPEND_PER_CALL) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    const progress = await prisma.gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ error: "No progress" }, { status: 400 })
    }

    // v3.6 — Si le user est frozen (anti-triche actif), refuser tout débit d'énergie
    if (isGamebookFrozen(progress as { gamebookFrozenUntil?: Date | null })) {
        return NextResponse.json({
            ok: false,
            reason: "Gamebook gelé suite à une suppression de reps. Reviens plus tard.",
            frozen: true,
            frozenUntil: (progress as { gamebookFrozenUntil?: Date | null }).gamebookFrozenUntil,
        }, { status: 200 })
    }

    const today = getTodayISO()
    const storedDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
    const storedSpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
    const currentSpent = storedDate === today ? storedSpent : 0

    const todayReps = await getTodayReps(userId)
    // v3.8 : pas de plafond à 0 — peut être négatif si gourde bue (énergie en surplus).
    let availableEnergy = todayReps - currentSpent

    // v3.8.5 — Mode créateur (isSystem) : on autorise toujours le débit.
    // L'énergie disponible renvoyée au client est paddée à 1000+ minimum.
    const creatorCheck = await (prisma as any).user.findUnique({
        where: { id: userId },
        select: { isSystem: true },
    })
    const isCreator = creatorCheck?.isSystem === true
    if (isCreator) {
        availableEnergy = Math.max(availableEnergy, 1000)
    }

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

    // v3.8.1 — Usure des baskets (si demandé et possédées intactes)
    const currentInventory = parseInventory((progress as { inventory?: unknown }).inventory)
    let updatedInventory = currentInventory
    let bootsBroken = false
    if (wearBoots && hasIntactItem(currentInventory, "boots")) {
        updatedInventory = wearItem(currentInventory, "boots", 1)
        // Détecter si on vient juste de casser les baskets
        const wasIntact = hasIntactItem(currentInventory, "boots")
        const stillIntact = hasIntactItem(updatedInventory, "boots")
        bootsBroken = wasIntact && !stillIntact
    }

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            energySpentToday: newSpent,
            energySpentDate: today,
            inventory: updatedInventory,
            lastSeen: new Date(),
        },
    })

    const reportedAvailable = isCreator
        ? Math.max(todayReps - newSpent, 1000)
        : (todayReps - newSpent)

    return NextResponse.json({
        ok: true,
        availableEnergy: reportedAvailable,
        energySpentToday: newSpent,
        amount,
        reason,
        inventory: updatedInventory,
        bootsBroken,
    })
}
