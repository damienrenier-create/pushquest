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
import { readEnergySnapshot, spendEnergyOnSnapshot, grantRewardOnSnapshot, computeAvailableEnergy } from "@/lib/gamebook/energy"

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

    // === GOURDES (flask, grande_gourde, grande_gourde_xl, mega_gourde) ===
    // v4.x — BUGFIX : avant, seul "flask" était géré → impossible de remplir/boire les
    // grandes gourdes et la Mega Gourde du Capo. On gère désormais TOUT item stockable.
    if (itemDef.capabilities.canStore) {
        const stored = readStored(entry.data)
        // v3.8.1 — capacité actuelle (peut avoir décrû via l'usure)
        const capacity = readMaxCapacity(entry.data, itemDef)

        if (capacity <= 0) {
            return NextResponse.json({ ok: false, reason: "Gourde cassée. Va t'en racheter une chez NUTRIPATES." })
        }

        const today = getTodayISO()
        const snap = readEnergySnapshot(progress, today)
        const todayReps = await getTodayReps(userId)
        const isCreator = await isCreatorAccount(userId)
        // v4.0 — Inclut bonusSurplus dans l'énergie disponible (pommiers/papa/etc.)
        const availableEnergy = padAvailableEnergyForCreator(computeAvailableEnergy(todayReps, snap), isCreator)

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
            // v4.0 — Débit via spendEnergyOnSnapshot (consomme bonusSurplus d'abord)
            const nextSnap = spendEnergyOnSnapshot(snap, amount, today)
            const newInventory = setItemData(inventory, itemKey, { stored: stored + amount, maxCapacity: capacity })
            await (prisma as any).gamebookProgress.update({
                where: { id: progress.id },
                data: {
                    energySpentToday: nextSnap.energySpentToday,
                    energySpentDate: today,
                    bonusSurplus: nextSnap.bonusSurplus,
                    inventory: newInventory,
                    lastSeen: new Date(),
                },
            })
            return NextResponse.json({
                ok: true,
                inventory: newInventory,
                availableEnergy: padAvailableEnergyForCreator(computeAvailableEnergy(todayReps, nextSnap), isCreator),
                energySpentToday: nextSnap.energySpentToday,
                bonusSurplus: nextSnap.bonusSurplus,
                filled: amount,
                stored: stored + amount,
            })
        }

        if (action === "drink") {
            if (stored <= 0) {
                return NextResponse.json({ ok: false, reason: "Gourde vide." })
            }
            // v4.0 — Boire la gourde = crédit dans bonusSurplus (au lieu de soustraire à energySpentToday)
            const nextSnap = grantRewardOnSnapshot(snap, stored, today)
            // v3.8.1 — la gourde s'use de wearOnDrink (10 par défaut) à chaque boire
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
                    energySpentToday: nextSnap.energySpentToday,
                    energySpentDate: today,
                    bonusSurplus: nextSnap.bonusSurplus,
                    inventory: newInventory,
                    ...(newTam ? { tamagotchi: newTam } : {}),
                    lastSeen: new Date(),
                },
            })
            return NextResponse.json({
                ok: true,
                inventory: newInventory,
                availableEnergy: padAvailableEnergyForCreator(computeAvailableEnergy(todayReps, nextSnap), isCreator),
                energySpentToday: nextSnap.energySpentToday,
                bonusSurplus: nextSnap.bonusSurplus,
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
        const snap = readEnergySnapshot(progress, today)
        const todayReps = await getTodayReps(userId)
        const isCreator = await isCreatorAccount(userId)
        const availableEnergy = padAvailableEnergyForCreator(computeAvailableEnergy(todayReps, snap), isCreator)

        if (availableEnergy <= 0) {
            return NextResponse.json({ ok: false, reason: "Tu n'as pas d'énergie à doubler. Reviens plus tard." })
        }

        // v4.0 — Doubler = crédit `availableEnergy` au bonusSurplus
        const bonus = availableEnergy
        const nextSnap = grantRewardOnSnapshot(snap, bonus, today)
        // Retirer l'item de l'inventaire (Corned Pâtes consommé)
        const newInventory = inventory.filter((e) => e.itemKey !== "corned_pates")

        await (prisma as any).gamebookProgress.update({
            where: { id: progress.id },
            data: {
                energySpentToday: nextSnap.energySpentToday,
                energySpentDate: today,
                bonusSurplus: nextSnap.bonusSurplus,
                inventory: newInventory,
                lastSeen: new Date(),
            },
        })

        return NextResponse.json({
            ok: true,
            inventory: newInventory,
            availableEnergy: padAvailableEnergyForCreator(computeAvailableEnergy(todayReps, nextSnap), isCreator),
            energySpentToday: nextSnap.energySpentToday,
            bonusSurplus: nextSnap.bonusSurplus,
            consumed: itemKey,
            bonus,
        })
    }

    return NextResponse.json({ ok: false, reason: "Aucune action gérée pour cet objet." }, { status: 400 })
}
