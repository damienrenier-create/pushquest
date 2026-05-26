// src/app/api/gamebook/daemon/allocate-points/route.ts
//
// v4.0 Phase 3 — POST : dépense des pendingStatPoints sur un Daemon.
//
// Body :
//   {
//     daemonId: string,
//     allocation: {
//       force?: number,
//       vitesse?: number,
//       defense?: number,
//       intelligence?: number,
//       endurance?: number,
//     },
//   }
//
// Règles :
//   - Chaque valeur d'allocation ≥ 0 (entier).
//   - sum(allocation) ≤ pendingStatPoints (on peut dépenser partiellement).
//   - Pour chaque stat X : bonus[X] + allocation[X] ≤ DAEMON_BONUS_MAX (80).
//   - Le Daemon doit être unlocked (sérum reçu).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { DAEMON_BONUS_MAX } from "@/lib/gamebook/daemon"

export const dynamic = "force-dynamic"

interface Allocation {
    force?: number
    vitesse?: number
    defense?: number
    intelligence?: number
    endurance?: number
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { daemonId?: string; allocation?: Allocation }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const daemonId = body.daemonId
    const allocation = body.allocation
    if (!daemonId || !allocation || typeof allocation !== "object") {
        return NextResponse.json({ ok: false, reason: "daemonId + allocation requis" }, { status: 400 })
    }

    const f = clampInt(allocation.force)
    const v = clampInt(allocation.vitesse)
    const d = clampInt(allocation.defense)
    const i = clampInt(allocation.intelligence)
    const e = clampInt(allocation.endurance)
    const total = f + v + d + i + e
    if (total <= 0) {
        return NextResponse.json({ ok: false, reason: "Allocation vide." }, { status: 400 })
    }

    const daemon = await (prisma as any).daemon.findUnique({ where: { id: daemonId } })
    if (!daemon || daemon.userId !== userId) {
        return NextResponse.json({ ok: false, reason: "Daemon introuvable" }, { status: 404 })
    }
    if (!daemon.unlockedAt) {
        return NextResponse.json({ ok: false, reason: "Daemon pas encore éveillé." }, { status: 400 })
    }
    if (total > daemon.pendingStatPoints) {
        return NextResponse.json({
            ok: false,
            reason: `Tu n'as que ${daemon.pendingStatPoints} points (tu tentes d'en dépenser ${total}).`,
        }, { status: 400 })
    }

    // Plafond par stat
    if (daemon.bonusFor + f > DAEMON_BONUS_MAX) return NextResponse.json({ ok: false, reason: "Force au plafond." }, { status: 400 })
    if (daemon.bonusVit + v > DAEMON_BONUS_MAX) return NextResponse.json({ ok: false, reason: "Vitesse au plafond." }, { status: 400 })
    if (daemon.bonusDef + d > DAEMON_BONUS_MAX) return NextResponse.json({ ok: false, reason: "Défense au plafond." }, { status: 400 })
    if (daemon.bonusInt + i > DAEMON_BONUS_MAX) return NextResponse.json({ ok: false, reason: "Intelligence au plafond." }, { status: 400 })
    if (daemon.bonusEnd + e > DAEMON_BONUS_MAX) return NextResponse.json({ ok: false, reason: "Endurance au plafond." }, { status: 400 })

    const updated = await (prisma as any).daemon.update({
        where: { id: daemonId },
        data: {
            bonusFor: daemon.bonusFor + f,
            bonusVit: daemon.bonusVit + v,
            bonusDef: daemon.bonusDef + d,
            bonusInt: daemon.bonusInt + i,
            bonusEnd: daemon.bonusEnd + e,
            pendingStatPoints: daemon.pendingStatPoints - total,
        },
    })

    return NextResponse.json({
        ok: true,
        spent: total,
        remaining: updated.pendingStatPoints,
        message: `+${f} F · +${v} V · +${d} D · +${i} I · +${e} E. ${updated.pendingStatPoints} points restants.`,
    })
}

function clampInt(v: unknown): number {
    if (typeof v !== "number" || !isFinite(v)) return 0
    return Math.max(0, Math.floor(v))
}
