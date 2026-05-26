// src/app/api/gamebook/daemon/feed/route.ts
//
// v4.0 Phase 1.C — POST : nourrir un Daemon avec un Corned Pâtes (consomme 1 item).
// Body : { daemonId: string }
//
// Effet : +30 happiness (cap 100), lastFedAt = now, retire 1 corned_pates de l'inventaire.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { parseInventory, removeItem, hasIntactItem } from "@/lib/gamebook/inventory"
import { DAEMON_HAPPINESS_MAX } from "@/lib/gamebook/daemon"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const FEED_HAPPINESS_BOOST = 30

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
    if (!hasIntactItem(inventory, "corned_pates")) {
        return NextResponse.json({ ok: false, reason: "Pas de Corned Pâtes dans le sac." })
    }

    const newInventory = removeItem(inventory, "corned_pates", 1)
    const newHappiness = Math.min(DAEMON_HAPPINESS_MAX, daemon.happiness + FEED_HAPPINESS_BOOST)

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
        message: `${daemon.name} dévore les Corned Pâtes. Bonheur ${newHappiness}/100 (+${FEED_HAPPINESS_BOOST}).`,
    })
}
