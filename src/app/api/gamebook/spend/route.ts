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
    // v3.17 — wearItemKey (string) : permet de wear chaussures_course / brassards / etc.
    // v3.17d — wearItemKeys (array) : permet de wear plusieurs items en un appel (ex: chaussures + lunettes).
    //          Backward compat : wearBoots=true équivaut à wearItemKey="boots".
    const wearItemKeys: string[] = (() => {
        if (Array.isArray(body.wearItemKeys)) {
            return body.wearItemKeys.filter((k: unknown): k is string => typeof k === "string" && k.length > 0)
        }
        if (typeof body.wearItemKey === "string" && body.wearItemKey.length > 0) {
            return [body.wearItemKey]
        }
        if (body.wearBoots === true) {
            return ["boots"]
        }
        return []
    })()

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
    // v3.23f — Modèle bonusSurplus : on consomme bonusSurplus d'abord, puis energySpentToday
    const { readEnergySnapshot, spendEnergyOnSnapshot, computeAvailableEnergy } = await import("@/lib/gamebook/energy")
    const snap = readEnergySnapshot(progress, today)

    const todayReps = await getTodayReps(userId)
    let availableEnergy = computeAvailableEnergy(todayReps, snap)

    // v3.8.5 — Mode créateur (isSystem) : on autorise toujours le débit.
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

    // Débiter (consomme bonusSurplus d'abord)
    const nextSnap = spendEnergyOnSnapshot(snap, amount, today)

    // v3.8.1 / v3.17 / v3.17d — Usure de chaque wearable utilisé (baskets, chaussures, brassards, lunettes...)
    const currentInventory = parseInventory((progress as { inventory?: unknown }).inventory)
    let updatedInventory = currentInventory
    const brokenItemKeys: string[] = []
    for (const wearKey of wearItemKeys) {
        if (!hasIntactItem(updatedInventory, wearKey)) continue
        updatedInventory = wearItem(updatedInventory, wearKey, 1)
        if (!hasIntactItem(updatedInventory, wearKey)) {
            brokenItemKeys.push(wearKey)
        }
    }
    const wearableBroken = brokenItemKeys.length > 0
    const brokenItemKey: string | null = brokenItemKeys[0] ?? null

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            energySpentToday: nextSnap.energySpentToday,
            energySpentDate: nextSnap.energySpentDate,
            bonusSurplus: nextSnap.bonusSurplus,
            inventory: updatedInventory,
            lastSeen: new Date(),
        },
    })

    const newAvailable = computeAvailableEnergy(todayReps, nextSnap)
    const reportedAvailable = isCreator
        ? Math.max(newAvailable, 1000)
        : newAvailable

    return NextResponse.json({
        ok: true,
        availableEnergy: reportedAvailable,
        energySpentToday: nextSnap.energySpentToday,
        bonusSurplus: nextSnap.bonusSurplus,
        amount,
        reason,
        inventory: updatedInventory,
        // v3.17 — bootsBroken conservé pour compat client. brokenItemKey est plus précis.
        bootsBroken: brokenItemKeys.includes("boots"),
        wearableBroken,
        brokenItemKey,
        // v3.17d — Liste complète des items cassés à cet appel (peut être > 1 si chaussures + lunettes simultanées)
        brokenItemKeys,
    })
}
