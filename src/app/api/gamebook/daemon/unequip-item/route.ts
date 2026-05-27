// src/app/api/gamebook/daemon/unequip-item/route.ts
//
// v4.0 Phase 5.D — POST : retire un item équipé d'un Daemon.
//
// Body : { daemonId, itemKey }
//
// Si la durabilité restante > 0, l'item retourne dans l'inventaire.
// Sinon (durabilité = 0), il est détruit (déjà cassé).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getItem, getInitialItemData } from "@/lib/gamebook/items"
import { parseInventory, addItem } from "@/lib/gamebook/inventory"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

interface EquippedEntry {
    itemKey: string
    durability: number
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { daemonId?: string; itemKey?: string }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const { daemonId, itemKey } = body
    if (!daemonId || !itemKey) {
        return NextResponse.json({ ok: false, reason: "daemonId + itemKey requis" }, { status: 400 })
    }

    const daemon = await (prisma as any).daemon.findUnique({ where: { id: daemonId } })
    if (!daemon || daemon.userId !== userId) {
        return NextResponse.json({ ok: false, reason: "Daemon introuvable." }, { status: 404 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    const rawEquipped = Array.isArray(daemon.equippedItems) ? daemon.equippedItems : []
    const equipped: EquippedEntry[] = rawEquipped.map((e: unknown) => {
        if (typeof e === "string") {
            const otherDef = getItem(e)
            return { itemKey: e, durability: otherDef?.capabilities.canEquipDaemon?.durabilityBattles ?? 5 }
        }
        const obj = e as { itemKey?: string; durability?: number }
        if (typeof obj?.itemKey === "string" && typeof obj?.durability === "number") {
            return { itemKey: obj.itemKey, durability: obj.durability }
        }
        return null as unknown as EquippedEntry
    }).filter(Boolean)

    const found = equipped.find((e) => e.itemKey === itemKey)
    if (!found) {
        return NextResponse.json({ ok: false, reason: "Cet item n'est pas équipé." }, { status: 400 })
    }

    const newEquipped = equipped.filter((e) => e.itemKey !== itemKey)
    let newInv = parseInventory(progress.inventory)
    let backToBag = false
    if (found.durability > 0) {
        const def = getItem(itemKey)
        if (def) {
            newInv = addItem(newInv, itemKey, getInitialItemData(def))
            backToBag = true
        }
    }

    await (prisma as any).daemon.update({
        where: { id: daemon.id },
        data: { equippedItems: newEquipped },
    })
    if (backToBag) {
        await (prisma as any).gamebookProgress.update({
            where: { id: progress.id },
            data: { inventory: newInv },
        })
    }

    return NextResponse.json({
        ok: true,
        equipped: newEquipped,
        returnedToBag: backToBag,
        message: backToBag
            ? `${itemKey} retiré et remis dans le sac (durabilité ${found.durability} restante).`
            : `${itemKey} retiré (cassé, il finit à la poubelle).`,
    })
}
