// src/app/api/gamebook/daemon/equip-item/route.ts
//
// v4.0 Phase 5.D — POST : équipe un item (canEquipDaemon) sur un Daemon.
//
// Body : { daemonId, itemKey }
//
// Effets :
//   - Vérifie item canEquipDaemon, présent dans l'inventaire intact.
//   - Vérifie max 4 items équipés sur le Daemon.
//   - Retire 1 du sac, ajoute { itemKey, durability: cap.durabilityBattles } à
//     Daemon.equippedItems (Json array de { itemKey, durability }).
//   - Le bonus stat sera snapshot au démarrage du prochain combat (Phase 5.B).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getItem } from "@/lib/gamebook/items"
import { parseInventory, removeItem, hasIntactItem } from "@/lib/gamebook/inventory"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const MAX_EQUIPPED = 4

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

    const def = getItem(itemKey)
    if (!def?.capabilities.canEquipDaemon) {
        return NextResponse.json({ ok: false, reason: "Item non équipable." }, { status: 400 })
    }
    const cap = def.capabilities.canEquipDaemon

    const daemon = await (prisma as any).daemon.findUnique({ where: { id: daemonId } })
    if (!daemon || daemon.userId !== userId) {
        return NextResponse.json({ ok: false, reason: "Daemon introuvable." }, { status: 404 })
    }
    if (!daemon.unlockedAt) {
        return NextResponse.json({ ok: false, reason: "Daemon pas encore éveillé." }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    const inv = parseInventory(progress.inventory)
    if (!hasIntactItem(inv, itemKey)) {
        return NextResponse.json({ ok: false, reason: `Pas de ${def.name} dans ton sac.` }, { status: 400 })
    }

    // Normalise equippedItems en format { itemKey, durability }[]
    const rawEquipped = Array.isArray(daemon.equippedItems) ? daemon.equippedItems : []
    const equipped: EquippedEntry[] = rawEquipped.map((e: unknown) => {
        if (typeof e === "string") {
            const otherDef = getItem(e)
            const dur = otherDef?.capabilities.canEquipDaemon?.durabilityBattles ?? 5
            return { itemKey: e, durability: dur }
        }
        const obj = e as { itemKey?: string; durability?: number }
        if (typeof obj?.itemKey === "string" && typeof obj?.durability === "number") {
            return { itemKey: obj.itemKey, durability: obj.durability }
        }
        return null as unknown as EquippedEntry
    }).filter(Boolean)

    if (equipped.length >= MAX_EQUIPPED) {
        return NextResponse.json({ ok: false, reason: `${daemon.name} a déjà ${MAX_EQUIPPED} équipements (max).` }, { status: 400 })
    }
    if (equipped.some((e) => e.itemKey === itemKey)) {
        return NextResponse.json({ ok: false, reason: "Cet équipement est déjà en place sur ce Daemon." }, { status: 400 })
    }

    const newEquipped = [...equipped, { itemKey, durability: cap.durabilityBattles }]
    const newInv = removeItem(inv, itemKey, 1)

    await (prisma as any).daemon.update({
        where: { id: daemon.id },
        data: { equippedItems: newEquipped },
    })
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { inventory: newInv },
    })

    return NextResponse.json({
        ok: true,
        equipped: newEquipped,
        message: `${daemon.name} porte désormais ${def.name}. +${cap.bonus} ${cap.stat.toUpperCase()} (${cap.durabilityBattles} combats).`,
    })
}
