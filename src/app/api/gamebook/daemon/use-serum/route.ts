// src/app/api/gamebook/daemon/use-serum/route.ts
//
// v4.0 Phase 1.D.bis — POST : utilise le Sérum de Poussière sur un Daemon
// pour le faire passer de "🐾 ANIMAL" à "👾 DAEMON" (révèle stats/type/combat).
//
// Body : { daemonId: string }
//
// Idempotent : si le Daemon est déjà déverrouillé, renvoie OK sans rien changer.
//
// NOTE Phase 1.D.bis : ce endpoint ne consomme PAS encore d'item d'inventaire.
// Quand l'arc Pastagone (mafia Team Boulette + drop sérum) sera livré (Phase 4-5),
// on ajoutera ici la vérification + consommation de l'item "serum_poussiere".

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

    let body: { daemonId?: string }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const daemonId = body.daemonId
    if (!daemonId) return NextResponse.json({ ok: false, reason: "daemonId requis" }, { status: 400 })

    const daemon = await (prisma as any).daemon.findUnique({ where: { id: daemonId } })
    if (!daemon || daemon.userId !== userId) {
        return NextResponse.json({ ok: false, reason: "Daemon introuvable" }, { status: 404 })
    }

    if (daemon.unlockedAt) {
        return NextResponse.json({
            ok: true,
            alreadyUnlocked: true,
            unlockedAt: daemon.unlockedAt,
            message: `${daemon.name} est déjà éveillé.`,
        })
    }

    const now = new Date()
    await (prisma as any).daemon.update({
        where: { id: daemonId },
        data: { unlockedAt: now },
    })

    return NextResponse.json({
        ok: true,
        alreadyUnlocked: false,
        unlockedAt: now,
        message: `Une lumière dorée enveloppe ${daemon.name}. Ses yeux changent. Il vient de se révéler comme DAEMON.`,
    })
}
