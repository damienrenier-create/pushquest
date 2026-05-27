// src/app/api/gamebook/daemon/boost-stat/route.ts
//
// v4.0 — POST : utilise un sérum boost permanent sur un Daemon.
// Ajoute amount à la baseStat correspondante (clamp DAEMON_STAT_MAX=100).
//
// Body : { daemonId: string, itemKey: string }

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getItem } from "@/lib/gamebook/items"
import { parseInventory, removeItem, hasIntactItem } from "@/lib/gamebook/inventory"
import { DAEMON_STAT_MAX } from "@/lib/gamebook/daemon"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

const STAT_TO_COLUMN: Record<string, "baseFor" | "baseVit" | "baseDef" | "baseInt" | "baseEnd"> = {
    force: "baseFor",
    vitesse: "baseVit",
    defense: "baseDef",
    intelligence: "baseInt",
    endurance: "baseEnd",
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
    if (!def?.capabilities.canPermanentStatBoost) {
        return NextResponse.json({ ok: false, reason: "Cet item n'est pas un sérum boost." }, { status: 400 })
    }
    const cap = def.capabilities.canPermanentStatBoost
    const column = STAT_TO_COLUMN[cap.stat]
    if (!column) {
        return NextResponse.json({ ok: false, reason: "Stat inconnue." }, { status: 400 })
    }

    const daemon = await (prisma as any).daemon.findUnique({ where: { id: daemonId } })
    if (!daemon || daemon.userId !== userId) {
        return NextResponse.json({ ok: false, reason: "Daemon introuvable" }, { status: 404 })
    }
    if (!daemon.unlockedAt) {
        return NextResponse.json({ ok: false, reason: "Daemon pas encore éveillé." }, { status: 400 })
    }

    const currentBase = daemon[column] as number
    if (currentBase >= DAEMON_STAT_MAX) {
        return NextResponse.json({
            ok: false,
            reason: `${cap.stat.toUpperCase()} déjà au plafond (${DAEMON_STAT_MAX}).`,
        }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    const inv = parseInventory(progress.inventory)
    if (!hasIntactItem(inv, itemKey)) {
        return NextResponse.json({ ok: false, reason: `Pas de ${def.name} dans ton sac.` }, { status: 400 })
    }

    const newBase = Math.min(DAEMON_STAT_MAX, currentBase + cap.amount)
    const newInv = removeItem(inv, itemKey, 1)

    await (prisma as any).daemon.update({
        where: { id: daemon.id },
        data: { [column]: newBase },
    })
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { inventory: newInv },
    })

    return NextResponse.json({
        ok: true,
        daemonId: daemon.id,
        stat: cap.stat,
        oldValue: currentBase,
        newValue: newBase,
        gained: newBase - currentBase,
        message: `${daemon.name} absorbe le sérum. ${cap.stat.toUpperCase()} ${currentBase} → ${newBase}.`,
    })
}
