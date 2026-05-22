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
        // v3.8.3 — Même si le sac est déjà donné, on s'assure que la carte est dans l'inventaire
        // (cas des users existants avant l'introduction de la carte).
        const currentInventory = parseInventory(progress.inventory)
        if (!hasIntactItem(currentInventory, "map")) {
            const mapDef = getItem("map")
            if (mapDef) {
                const newInventory = addItem(currentInventory, "map", getInitialItemData(mapDef))
                await (prisma as any).gamebookProgress.update({
                    where: { id: progress.id },
                    data: { inventory: newInventory, lastSeen: new Date() },
                })
                return NextResponse.json({
                    ok: true,
                    alreadyHasBag: true,
                    hasBag: true,
                    inventory: newInventory,
                    mapAdded: true,
                })
            }
        }
        return NextResponse.json({ ok: true, alreadyHasBag: true, hasBag: true })
    }

    // v3.8.3 — Ajout simultané de l'item "map" (carte des joueurs) à l'inventaire
    const currentInventory = parseInventory(progress.inventory)
    let newInventory = currentInventory
    const mapDef = getItem("map")
    if (mapDef && !hasIntactItem(currentInventory, "map")) {
        newInventory = addItem(currentInventory, "map", getInitialItemData(mapDef))
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
    })
}
