// src/app/api/gamebook/shop/buy/route.ts
//
// v3.8 — POST : achat d'un item au shop de Pépiteville.
// Payload : { itemKey: string }
//
// Logique :
//   1. Auth, get progress
//   2. Refus si frozen, si pas de sac, si item déjà au max, si pas assez d'énergie
//   3. Transaction Prisma : débit reps via energySpentToday + ajout de l'item à l'inventory
//
// Note : on ne fait PAS d'appel HTTP interne à /api/gamebook/spend.
// Plus robuste de faire tout en une transaction Prisma.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isGamebookFrozen } from "@/lib/gamebook/antiCheat"
import { getItem } from "@/lib/gamebook/items"
import { parseInventory, addItem, hasItem } from "@/lib/gamebook/inventory"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

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

    const itemKey = typeof body.itemKey === "string" ? body.itemKey : null
    if (!itemKey) {
        return NextResponse.json({ ok: false, reason: "itemKey requis." }, { status: 400 })
    }

    const itemDef = getItem(itemKey)
    if (!itemDef) {
        return NextResponse.json({ ok: false, reason: "Objet inconnu." }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }

    if (isGamebookFrozen(progress as { gamebookFrozenUntil?: Date | null })) {
        return NextResponse.json({
            ok: false,
            reason: "Gamebook gelé.",
            frozen: true,
            frozenUntil: (progress as { gamebookFrozenUntil?: Date | null }).gamebookFrozenUntil,
        })
    }

    if (progress.hasBag !== true) {
        return NextResponse.json({ ok: false, reason: "Tu n'as pas de sac. Trouve PEPITO d'abord." })
    }

    const currentInventory = parseInventory(progress.inventory)
    if (hasItem(currentInventory, itemKey)) {
        return NextResponse.json({ ok: false, reason: "Tu en as déjà un." })
    }

    // Calcul de l'énergie disponible
    const today = getTodayISO()
    const storedDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
    const storedSpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
    const currentSpent = storedDate === today ? storedSpent : 0

    const todayReps = await getTodayReps(userId)
    const availableEnergy = todayReps - currentSpent

    if (availableEnergy < itemDef.priceReps) {
        return NextResponse.json({
            ok: false,
            reason: `${itemDef.name} coûte ${itemDef.priceReps} reps. Tu en as ${availableEnergy}.`,
            availableEnergy,
        })
    }

    // Transaction : débit + ajout à inventory
    const newSpent = currentSpent + itemDef.priceReps
    // Initial data selon le type d'item
    const initialData = itemDef.capabilities.canStore ? { stored: 0 } : undefined
    const newInventory = addItem(currentInventory, itemKey, initialData)

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            energySpentToday: newSpent,
            energySpentDate: today,
            inventory: newInventory,
            lastSeen: new Date(),
        },
    })

    return NextResponse.json({
        ok: true,
        inventory: newInventory,
        availableEnergy: todayReps - newSpent,
        energySpentToday: newSpent,
        purchased: itemKey,
    })
}
