// src/app/api/gamebook/grant-bag/route.ts
//
// v3.8 — POST : PEPITO donne le sac au joueur (1ère fois uniquement).
// Idempotent : si hasBag === true, retourne { ok: true, alreadyHasBag: true } sans rien faire.
// Refusé si frozen (v3.6).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isGamebookFrozen } from "@/lib/gamebook/antiCheat"
import { parseInventory, addItem, hasIntactItem } from "@/lib/gamebook/inventory"
import { getInitialItemData, getItem } from "@/lib/gamebook/items"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

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

    if (progress.hasBag === true) {
        // v3.8.3 — Si sac déjà donné mais map manquante (users avant v3.8.3) : on l'ajoute.
        // v3.22 — Idem pour les baskets : on les ajoute si manquantes.
        const currentInventory = parseInventory(progress.inventory)
        let newInventory = currentInventory
        let needsUpdate = false
        const mapDef = getItem("map")
        if (mapDef && !hasIntactItem(newInventory, "map")) {
            newInventory = addItem(newInventory, "map", getInitialItemData(mapDef))
            needsUpdate = true
        }
        const bootsDef = getItem("boots")
        if (bootsDef && !hasIntactItem(newInventory, "boots")) {
            newInventory = addItem(newInventory, "boots", getInitialItemData(bootsDef))
            needsUpdate = true
        }
        if (needsUpdate) {
            await (prisma as any).gamebookProgress.update({
                where: { id: progress.id },
                data: { inventory: newInventory, lastSeen: new Date() },
            })
            return NextResponse.json({
                ok: true,
                alreadyHasBag: true,
                hasBag: true,
                inventory: newInventory,
                bootsAdded: true,
            })
        }
        return NextResponse.json({ ok: true, alreadyHasBag: true, hasBag: true })
    }

    // v3.8.3 — Ajout simultané de l'item "map" (carte des joueurs) à l'inventaire
    // v3.22 — Ajout des baskets "boots" en cadeau de MAMAN (ou PEPITO en backup)
    const currentInventory = parseInventory(progress.inventory)
    let newInventory = currentInventory
    const mapDef = getItem("map")
    if (mapDef && !hasIntactItem(newInventory, "map")) {
        newInventory = addItem(newInventory, "map", getInitialItemData(mapDef))
    }
    const bootsDef = getItem("boots")
    if (bootsDef && !hasIntactItem(newInventory, "boots")) {
        newInventory = addItem(newInventory, "boots", getInitialItemData(bootsDef))
    }

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { hasBag: true, inventory: newInventory, lastSeen: new Date() },
    })

    return NextResponse.json({
        ok: true,
        hasBag: true,
        alreadyHasBag: false,
        inventory: newInventory,
        mapAdded: true,
        bootsAdded: true,
    })
}
