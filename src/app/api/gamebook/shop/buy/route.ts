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
import { getItem, getInitialItemData, applySocialDiscount, isBrokenItem } from "@/lib/gamebook/items"
import { parseInventory, addItem, hasIntactItem } from "@/lib/gamebook/inventory"
import { isCreatorAccount, padAvailableEnergyForCreator } from "@/lib/gamebook/creator"
import { getUserDifficultyRatio, applyRatio } from "@/lib/gamebook/difficulty"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

async function getTodayReps(userId: string): Promise<number> {
    const today = getTodayISO()
    const sets = await prisma.exerciseSet.findMany({
        where: { userId, date: today },
    })
    // v3.23k — 1 sec de gainage = 1/5 énergie (cohérent avec scoring 5s=1pt)
    return sets.reduce((sum: number, s: { exercise: string; reps: number }) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps), 0)
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
    // v3.8.1 — refuse l'achat uniquement si on possède un exemplaire INTACT (non-cassé).
    // Un item cassé peut être remplacé par une nouvelle instance neuve.
    if (hasIntactItem(currentInventory, itemKey)) {
        return NextResponse.json({ ok: false, reason: "Tu en as déjà un en état de marche." })
    }

    // v3.17 — Refuse l'achat d'un wearable non-tile-restricted (boots/chaussures) si un autre intact existe.
    // Permet de coexister avec brassards (tile-restricted) sans conflit.
    if (itemDef.capabilities.canWear && !itemDef.capabilities.canWear.tileRestriction) {
        const conflict = currentInventory.find((entry) => {
            if (entry.itemKey === itemKey) return false
            const otherDef = getItem(entry.itemKey)
            if (!otherDef?.capabilities.canWear) return false
            if (otherDef.capabilities.canWear.tileRestriction) return false
            return !isBrokenItem(entry.data, otherDef)
        })
        if (conflict) {
            const conflictDef = getItem(conflict.itemKey)
            return NextResponse.json({
                ok: false,
                reason: `Tu portes déjà ${(conflictDef?.name ?? "un autre équipement").toLowerCase()}. Use-les jusqu'à la cassure d'abord.`,
            })
        }
    }

    // Calcul de l'énergie disponible
    const today = getTodayISO()
    const storedDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
    const storedSpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
    const currentSpent = storedDate === today ? storedSpent : 0

    const todayReps = await getTodayReps(userId)
    const isCreator = await isCreatorAccount(userId)
    // v3.8.5 — pad pour créateur (achat toujours possible avec godmode)
    const availableEnergy = padAvailableEnergyForCreator(todayReps - currentSpent, isCreator)

    // v3.10 — prix ajusté selon le ratio de difficulté (onboarding paye moins)
    const ratio = await getUserDifficultyRatio(userId)
    const ratioPrice = applyRatio(itemDef.priceReps, ratio)
    // v3.17 — discount social (Lunettes) appliqué après le ratio
    const finalPrice = applySocialDiscount(ratioPrice, currentInventory)

    if (availableEnergy < finalPrice) {
        return NextResponse.json({
            ok: false,
            reason: `${itemDef.name} coûte ${finalPrice} reps. Tu en as ${availableEnergy}.`,
            availableEnergy,
        })
    }

    // Transaction : débit + ajout à inventory (utilise le prix final post-discount)
    const newSpent = currentSpent + finalPrice
    // v3.8.1 — data initial dépend des capabilities (canStore = gourde, canWear = baskets...)
    const initialData = getInitialItemData(itemDef)
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

    // v3.8.9 — Tracker le dernier achat pour le dialogue NUTRIPATES.
    // On exclut les comptes créateur (isSystem=true) sinon le compte test pollue les news.
    if (!isCreator) {
        try {
            const buyer = await (prisma as any).user.findUnique({
                where: { id: userId },
                select: { nickname: true },
            })
            if (buyer?.nickname) {
                const payload = JSON.stringify({
                    userId,
                    nickname: buyer.nickname,
                    itemKey,
                    itemName: itemDef.name,
                    at: new Date().toISOString(),
                })
                await (prisma as any).globalConfig.upsert({
                    where: { key: "lastShopPurchase" },
                    update: { value: payload },
                    create: { key: "lastShopPurchase", value: payload },
                })
            }
        } catch (e) {
            console.warn("[shop/buy] could not update lastShopPurchase", e)
        }
    }

    return NextResponse.json({
        ok: true,
        inventory: newInventory,
        availableEnergy: padAvailableEnergyForCreator(todayReps - newSpent, isCreator),
        energySpentToday: newSpent,
        purchased: itemKey,
    })
}
