// src/app/api/gamebook/daemon/in-bag/route.ts
//
// v4.0 Phase 1.C — POST : toggle l'état "rangé dans le sac" d'un Daemon.
// Body : { daemonId: string, inBag: boolean }
//
// inBag=true : le Daemon est caché de la map (pas affiché derrière le joueur).
// inBag=false : visible / actif comme follower.

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

    let body: { daemonId?: string; inBag?: boolean }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    if (!body.daemonId || typeof body.inBag !== "boolean") {
        return NextResponse.json({ ok: false, reason: "daemonId + inBag requis" }, { status: 400 })
    }

    const daemon = await (prisma as any).daemon.findUnique({ where: { id: body.daemonId } })
    if (!daemon || daemon.userId !== userId) {
        return NextResponse.json({ ok: false, reason: "Daemon introuvable" }, { status: 404 })
    }

    await (prisma as any).daemon.update({
        where: { id: body.daemonId },
        data: { inBag: body.inBag },
    })

    return NextResponse.json({
        ok: true,
        inBag: body.inBag,
        message: body.inBag
            ? `Tu ranges ${daemon.name} dans le sac.`
            : `${daemon.name} ressort joyeusement.`,
    })
}
