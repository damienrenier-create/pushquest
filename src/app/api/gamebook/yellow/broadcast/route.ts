// src/app/api/gamebook/yellow/broadcast/route.ts
//
// POST /api/gamebook/yellow/broadcast
//   body: { channel, type, ...payload }
//
// Relai temps réel du Nexus Jaune (casino multijoueur + défis + combat PvP).
// Le client poste ici ; le serveur ajoute l'identité authentifiée (userId +
// nickname) et publie sur Pusher. Anti-usurpation : on ne peut pas émettre au nom
// d'un autre. Contrairement à la route v3, les comptes isSystem SONT autorisés
// (le chapitre yellow est créateur-gated : c'est Sartay qui teste).
//
// Canaux autorisés : "yellow_casino" (présence) et "yellow_battle_<id>" (combat).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getPusher, PUSHER_ENABLED } from "@/lib/pusher"

export const dynamic = "force-dynamic"

// Throttle anti-flood : 1 message / 120ms / user (un peu plus permissif que v3
// pour fluidifier les déplacements casino, mais borné pour le quota Sandbox).
const lastByUser: Map<string, number> = new Map()
const THROTTLE_MS = 120

// Types d'évènements autorisés (présence + défi + combat).
const VALID_TYPES = new Set([
    "player:move", "player:hello", "player:disconnect",
    "challenge:send", "challenge:cancel", "challenge:respond",
    "battle:action", "battle:state", "battle:forfeit", "battle:hello",
])

/** Un canal yellow valide : présence du casino OU un combat privé. */
function isValidChannel(ch: string): boolean {
    return ch === "yellow_casino" || /^yellow_battle_[A-Za-z0-9_-]{4,64}$/.test(ch)
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!PUSHER_ENABLED) {
        return NextResponse.json({ ok: true, published: false, reason: "Pusher disabled" })
    }

    // Throttle (le battle:action et les hello passent toujours pour rester réactifs).
    let body: Record<string, unknown>
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }

    const type = typeof body.type === "string" ? body.type : ""
    const channel = typeof body.channel === "string" ? body.channel : ""
    if (!VALID_TYPES.has(type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    if (!isValidChannel(channel)) return NextResponse.json({ error: "Invalid channel" }, { status: 400 })

    const throttled = type === "player:move"
    if (throttled) {
        const now = Date.now()
        const last = lastByUser.get(userId) ?? 0
        if (now - last < THROTTLE_MS) return NextResponse.json({ ok: false, reason: "Rate limited" }, { status: 429 })
        lastByUser.set(userId, now)
    }

    // Identité (nickname) depuis la session/DB — jamais fournie par le client.
    let nickname = "?"
    try {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } })
        nickname = user?.nickname ?? "?"
    } catch (e) {
        console.warn("[yellow/broadcast] user lookup failed", e)
    }

    // Payload filtré (le client ne contrôle ni userId ni nickname).
    const payload: Record<string, unknown> = {
        type,
        userId,
        nickname,
        posX: typeof body.posX === "number" ? body.posX : undefined,
        posY: typeof body.posY === "number" ? body.posY : undefined,
        direction: typeof body.direction === "string" ? body.direction : undefined,
        targetUserId: typeof body.targetUserId === "string" ? body.targetUserId : undefined,
        accepted: typeof body.accepted === "boolean" ? body.accepted : undefined,
        battleId: typeof body.battleId === "string" ? body.battleId : undefined,
        // `data` : charge utile libre (action de combat, état relayé…). Bornée à 8 Ko.
        data: typeof body.data === "object" && body.data !== null ? body.data : undefined,
        timestamp: Date.now(),
    }

    const pusher = getPusher()
    if (!pusher) return NextResponse.json({ ok: true, published: false, reason: "Pusher unavailable" })
    try {
        await pusher.trigger(`gamebook-${channel}`, type, payload)
        return NextResponse.json({ ok: true, published: true })
    } catch (e) {
        console.warn("[yellow/broadcast] publish failed", e)
        return NextResponse.json({ ok: false, published: false }, { status: 200 })
    }
}
