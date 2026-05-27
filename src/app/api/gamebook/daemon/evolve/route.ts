// src/app/api/gamebook/daemon/evolve/route.ts
//
// v4.0 — POST : utilise une pierre d'évolution sur un Daemon pour changer son type.
//
// Body : { daemonId: string, itemKey: string }
//
// Effets :
//   - Vérifie item canEvolveType + présent dans inventaire intact.
//   - Vérifie Daemon owned + unlocked.
//   - Remplace Daemon.type par newType (permanent).
//   - Consomme 1 item du sac.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getItem } from "@/lib/gamebook/items"
import { parseInventory, removeItem, hasIntactItem } from "@/lib/gamebook/inventory"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

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
    if (!def?.capabilities.canEvolveType) {
        return NextResponse.json({ ok: false, reason: "Cet item n'est pas une pierre d'évolution." }, { status: 400 })
    }
    const newType = def.capabilities.canEvolveType.newType

    const daemon = await (prisma as any).daemon.findUnique({ where: { id: daemonId } })
    if (!daemon || daemon.userId !== userId) {
        return NextResponse.json({ ok: false, reason: "Daemon introuvable" }, { status: 404 })
    }
    if (!daemon.unlockedAt) {
        return NextResponse.json({ ok: false, reason: "Daemon pas encore éveillé." }, { status: 400 })
    }
    if (daemon.type === newType) {
        return NextResponse.json({ ok: false, reason: `${daemon.name} est déjà de type ${newType}.` }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    const inv = parseInventory(progress.inventory)
    if (!hasIntactItem(inv, itemKey)) {
        return NextResponse.json({ ok: false, reason: `Pas de ${def.name} dans ton sac.` }, { status: 400 })
    }

    const newInv = removeItem(inv, itemKey, 1)

    await (prisma as any).daemon.update({
        where: { id: daemon.id },
        data: { type: newType },
    })
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { inventory: newInv },
    })

    return NextResponse.json({
        ok: true,
        daemonId: daemon.id,
        oldType: daemon.type,
        newType,
        message: `${daemon.name} brille intensément… Son type devient ${newType} !`,
    })
}
