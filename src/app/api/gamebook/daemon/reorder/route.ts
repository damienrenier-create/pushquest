// src/app/api/gamebook/daemon/reorder/route.ts
//
// v4.0 Phase 1.B — POST : réorganise l'ordre des Daemons dans l'équipe.
// Body : { newOrder: string[] }  (array de daemon IDs dans le nouvel ordre slot 1..N)
//
// Le slot 1 est le leader. Réordonner = changer le leader.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { newOrder?: string[] }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const newOrder = body.newOrder
    if (!Array.isArray(newOrder) || newOrder.length === 0 || newOrder.length > 6) {
        return NextResponse.json({ ok: false, reason: "newOrder invalide (1..6 IDs)." }, { status: 400 })
    }

    // Vérifier que tous les IDs appartiennent bien au user
    const owned = await (prisma as any).daemon.findMany({
        where: { userId, id: { in: newOrder } },
        select: { id: true },
    })
    if (owned.length !== newOrder.length) {
        return NextResponse.json({ ok: false, reason: "Un ou plusieurs daemons ne t'appartiennent pas." }, { status: 403 })
    }

    // Update en 2 passes pour éviter le conflit unique (userId, slotIndex)
    // Pass 1 : déplacer tous les daemons concernés à des slots négatifs temporaires
    for (let i = 0; i < newOrder.length; i++) {
        await (prisma as any).daemon.update({
            where: { id: newOrder[i] },
            data: { slotIndex: -(i + 1) },
        })
    }
    // Pass 2 : remettre aux bons slots
    for (let i = 0; i < newOrder.length; i++) {
        await (prisma as any).daemon.update({
            where: { id: newOrder[i] },
            data: { slotIndex: i + 1 },
        })
    }

    return NextResponse.json({ ok: true, newLeaderId: newOrder[0] })
}
