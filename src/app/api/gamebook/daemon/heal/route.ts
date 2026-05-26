// src/app/api/gamebook/daemon/heal/route.ts
//
// v4.0 Phase 1.C — POST : soigne le Daemon (restaure HP combat + happiness max).
// Body : { daemonId: string, full?: boolean }
//   - full=true (default) : happiness à 100 + HP combat à max
//   - full=false : juste HP combat
//
// Utilisé après KO ou par l'infirmerie Pastagone. PAS de coût ici (la route appelante
// gère le débit énergie si besoin).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { DAEMON_HAPPINESS_MAX, computeMaxHp } from "@/lib/gamebook/daemon"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { daemonId?: string; full?: boolean }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const daemonId = body.daemonId
    const full = body.full !== false  // default true
    if (!daemonId) return NextResponse.json({ ok: false, reason: "daemonId requis" }, { status: 400 })

    const daemon = await (prisma as any).daemon.findUnique({ where: { id: daemonId } })
    if (!daemon || daemon.userId !== userId) {
        return NextResponse.json({ ok: false, reason: "Daemon introuvable" }, { status: 404 })
    }

    const maxHp = computeMaxHp(daemon.baseEnd, daemon.combatLevel, daemon.bonusEnd)
    const data: Record<string, unknown> = { currentHp: maxHp, lastFedAt: new Date() }
    if (full) data.happiness = DAEMON_HAPPINESS_MAX

    await (prisma as any).daemon.update({ where: { id: daemonId }, data })

    return NextResponse.json({
        ok: true,
        currentHp: maxHp,
        maxHp,
        happiness: full ? DAEMON_HAPPINESS_MAX : daemon.happiness,
        message: full
            ? `${daemon.name} est soigné. Bonheur ${DAEMON_HAPPINESS_MAX}/100, HP ${maxHp}/${maxHp}.`
            : `${daemon.name} récupère ses HP : ${maxHp}/${maxHp}.`,
    })
}
