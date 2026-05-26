// src/app/api/gamebook/inventory/use/route.ts
//
// v3.8 — POST : utilisation d'un item de l'inventaire.
// Payload : { itemKey: string, action: "fill" | "drink", amount?: number }
//
// Actions supportées pour la gourde ("flask") :
//   - fill : transfère `amount` reps de l'énergie courante vers data.stored
//   - drink : vide entièrement la gourde, ajoute tout son contenu à l'énergie courante
//            (peut faire passer availableEnergy au-dessus de todayReps — pas de plafond)
//
// Extension future : nouvelle action → ajouter un case dans le switch.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isGamebookFrozen } from "@/lib/gamebook/antiCheat"
import { getItem, readStored, readMaxCapacity } from "@/lib/gamebook/items"
import { parseInventory, findItem, setItemData } from "@/lib/gamebook/inventory"
import { isCreatorAccount, padAvailableEnergyForCreator } from "@/lib/gamebook/creator"

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
    const action = typeof body.action === "string" ? body.action : null
    const requestedAmount = typeof body.amount === "number" && Number.isFinite(body.amount)
        ? Math.max(0, Math.floor(body.amount))
        : 0

    if (!itemKey || !action) {
        return NextResponse.json({ ok: false, reason: "itemKey et action requis." }, { status: 400 })
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

    const inventory = parseInventory(progress.inventory)
    const entry = findItem(inventory, itemKey)
    if (!entry) {
        return NextResponse.json({ ok: false, reason: "Tu ne possèdes pas cet objet." })
    }

    // === GOURDE ===
    if (itemKey === "flask") {
        const stored = readStored(entry.data)
        // v3.8.1 — capacité actuelle (peut avoir décrû via l'usure)
        const capacity = readMaxCapacity(entry.data, itemDef)

        if (capacity <= 0) {
            return NextResponse.json({ ok: false, reason: "Gourde cassée. Va t'en racheter une chez NUTRIPATES." })
        }

        const today = getTodayISO()
        const storedDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
        const storedSpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
        const currentSpent = storedDate === today ? storedSpent : 0
        const todayReps = await getTodayReps(userId)
        const isCreator = await isCreatorAccount(userId)
        // v3.8.5 — pad pour créateur (action use toujours possible avec godmode)
        const availableEnergy = padAvailableEnergyForCreator(todayReps - currentSpent, isCreator)

        if (action === "fill") {
            if (requestedAmount <= 0) {
                return NextResponse.json({ ok: false, reason: "Montant invalide." })
            }
            if (availableEnergy <= 0) {
                return NextResponse.json({ ok: false, reason: "Pas d'énergie disponible à transvaser." })
            }
            const maxAddable = Math.min(capacity - stored, availableEnergy)
            const amount = Math.min(requestedAmount, maxAddable)
            if (amount <= 0) {
                return NextResponse.json({ ok: false, reason: "Gourde déjà pleine ou rien à transvaser." })
            }
            const newSpent = currentSpent + amount
            const newInventory = setItemData(inventory, itemKey, { stored: stored + amount, maxCapacity: capacity })
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
                availableEnergy: padAvailableEnergyForCreator(todayReps - newSpent, isCreator),
                energySpentToday: newSpent,
                filled: amount,
                stored: stored + amount,
            })
        }

        if (action === "drink") {
            if (stored <= 0) {
                return NextResponse.json({ ok: false, reason: "Gourde vide." })
            }
            // On vide tout d'un trait. energySpentToday peut devenir négatif (= surplus).
            // v3.8.1 — la gourde s'use de wearOnDrink (10 par défaut) à chaque boire
            const newSpent = currentSpent - stored
            const wear = itemDef.capabilities.canStore?.wearOnDrink ?? 0
            const newMaxCapacity = Math.max(0, capacity - wear)
            const newInventory = setItemData(inventory, itemKey, { stored: 0, maxCapacity: newMaxCapacity })

            // v3.37 (règle e) — Boire sans en donner à l'animal :
            //   -1 happiness si l'animal est dans le sac (caché)
            //   -3 happiness si l'animal est visible (hors-sac, sur la map)
            const { applyHappinessDelta, HAPPINESS_DELTAS } = await import("@/lib/gamebook/happinessChanges")
            const inBag = (progress as { tamagotchiInBag?: boolean }).tamagotchiInBag === true
            const delta = inBag ? HAPPINESS_DELTAS.DRINK_IN_BAG : HAPPINESS_DELTAS.DRINK_VISIBLE
            const newTam = applyHappinessDelta((progress as { tamagotchi?: unknown }).tamagotchi, delta)

            await (prisma as any).gamebookProgress.update({
                where: { id: progress.id },
                data: {
                    energySpentToday: newSpent,
                    energySpentDate: today,
                    inventory: newInventory,
                    ...(newTam ? { tamagotchi: newTam } : {}),
                    lastSeen: new Date(),
                },
            })
            return NextResponse.json({
                ok: true,
                inventory: newInventory,
                availableEnergy: padAvailableEnergyForCreator(todayReps - newSpent, isCreator),
                energySpentToday: newSpent,
                drank: stored,
                stored: 0,
                maxCapacity: newMaxCapacity,
                broken: newMaxCapacity <= 0,
                happinessDelta: newTam ? delta : 0,
            })
        }

        return NextResponse.json({ ok: false, reason: "Action invalide pour la gourde." }, { status: 400 })
    }

    // === v3.13 : CORNED PÂTES (consommable, double l'énergie) ===
    if (itemKey === "corned_pates" && action === "consume") {
        const today = getTodayISO()
        const storedDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
        const storedSpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
        const currentSpent = storedDate === today ? storedSpent : 0
        const todayReps = await getTodayReps(userId)
        const isCreator = await isCreatorAccount(userId)
        const availableEnergy = padAvailableEnergyForCreator(todayReps - currentSpent, isCreator)

        if (availableEnergy <= 0) {
            return NextResponse.json({ ok: false, reason: "Tu n'as pas d'énergie à doubler. Reviens plus tard." })
        }

        // Doubler l'énergie disponible = ajouter un bonus égal à availableEnergy → soustraire de energySpentToday
        const bonus = availableEnergy
        const newSpent = currentSpent - bonus
        // Retirer l'item de l'inventaire (Corned Pâtes consommé)
        const newInventory = inventory.filter((e) => e.itemKey !== "corned_pates")

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
            availableEnergy: padAvailableEnergyForCreator(todayReps - newSpent, isCreator),
            energySpentToday: newSpent,
            consumed: itemKey,
            bonus,
        })
    }

    return NextResponse.json({ ok: false, reason: "Aucune action gérée pour cet objet." }, { status: 400 })
}
