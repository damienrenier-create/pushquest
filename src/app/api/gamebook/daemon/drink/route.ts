// src/app/api/gamebook/daemon/drink/route.ts
//
// v4.0 Phase 1.C — POST : donner à boire à un Daemon (consomme 10 reps stockés
// d'une gourde + restaure happiness).
// Body : { daemonId: string, gourdeKey?: string (auto-select si absent) }

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { parseInventory, setItemData } from "@/lib/gamebook/inventory"
import { getItem } from "@/lib/gamebook/items"
import { DAEMON_HAPPINESS_MAX } from "@/lib/gamebook/daemon"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const DRINK_AMOUNT = 10
const DRINK_HAPPINESS_BOOST = 10

const GOURDE_KEYS = ["flask", "grande_gourde", "grande_gourde_xl", "mega_gourde"]

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { daemonId?: string }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const daemonId = body.daemonId
    if (!daemonId) return NextResponse.json({ ok: false, reason: "daemonId requis" }, { status: 400 })

    const daemon = await (prisma as any).daemon.findUnique({ where: { id: daemonId } })
    if (!daemon || daemon.userId !== userId) {
        return NextResponse.json({ ok: false, reason: "Daemon introuvable" }, { status: 404 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    const inventory = parseInventory((progress as { inventory?: unknown }).inventory)

    // Cherche la meilleure gourde avec >= 10 stored
    let chosenKey: string | null = null
    let chosenStored = 0
    for (const key of GOURDE_KEYS) {
        const entry = inventory.find((e) => e.itemKey === key)
        if (!entry) continue
        const data = (entry.data ?? {}) as { stored?: number }
        const stored = typeof data.stored === "number" ? data.stored : 0
        if (stored >= DRINK_AMOUNT && stored > chosenStored) {
            chosenKey = key
            chosenStored = stored
        }
    }

    if (!chosenKey) {
        return NextResponse.json({ ok: false, reason: "Aucune gourde avec assez d'eau (10 min)." })
    }

    const entry = inventory.find((e) => e.itemKey === chosenKey)!
    const def = getItem(chosenKey)!
    const currentData = (entry.data ?? {}) as { stored?: number; maxCapacity?: number }
    const newStored = (currentData.stored ?? 0) - DRINK_AMOUNT
    const maxCapacity = currentData.maxCapacity ?? def.capabilities.canStore?.maxCapacity ?? 100
    const newInventory = setItemData(inventory, chosenKey, { stored: newStored, maxCapacity })
    const newHappiness = Math.min(DAEMON_HAPPINESS_MAX, daemon.happiness + DRINK_HAPPINESS_BOOST)

    await (prisma as any).daemon.update({
        where: { id: daemonId },
        data: { happiness: newHappiness, lastFedAt: new Date() },
    })
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { inventory: newInventory },
    })

    return NextResponse.json({
        ok: true,
        happiness: newHappiness,
        gourdeKey: chosenKey,
        message: `${daemon.name} boit (-${DRINK_AMOUNT} de la ${def.name}). Bonheur ${newHappiness}/100 (+${DRINK_HAPPINESS_BOOST}).`,
    })
}
