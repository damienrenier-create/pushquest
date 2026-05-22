// src/app/api/gamebook/broadcast/route.ts
//
// POST /api/gamebook/broadcast
//   body: { type, mapId, ...payload }
//
// Le client appelle cette route pour broadcaster une action (mouvement, push, cinématique).
// Le serveur valide, ajoute l'identité authentifiée (userId, nickname) et publie sur Pusher.
// Anti-cheat : impossible de broadcaster en tant qu'un autre user.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { publishToGamebook, PUSHER_ENABLED, type PusherEventType } from "@/lib/pusher"

export const dynamic = "force-dynamic"

// Throttle anti-flood : on accepte max 1 broadcast / 200ms / user
const lastBroadcastByUser: Map<string, number> = new Map()
const THROTTLE_MS = 200

const VALID_TYPES: PusherEventType[] = [
    "player:move",
    "player:push",
    "player:disconnect",
    "cinematic:trigger",
]

const VALID_MAP_IDS = ["bourgpates", "gym", "casino", "cave", "route1"]

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    // Si Pusher pas configuré, on accepte mais on ne broadcast pas (no-op)
    if (!PUSHER_ENABLED) {
        return NextResponse.json({ ok: true, published: false, reason: "Pusher disabled" })
    }

    // Throttle
    const now = Date.now()
    const lastTs = lastBroadcastByUser.get(userId) ?? 0
    if (now - lastTs < THROTTLE_MS) {
        return NextResponse.json({ ok: false, reason: "Rate limited" }, { status: 429 })
    }
    lastBroadcastByUser.set(userId, now)

    let body: Record<string, unknown>
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    const type = typeof body.type === "string" ? (body.type as PusherEventType) : null
    const mapId = typeof body.mapId === "string" ? body.mapId : null

    if (!type || !VALID_TYPES.includes(type)) {
        return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }
    if (!mapId || !VALID_MAP_IDS.includes(mapId)) {
        return NextResponse.json({ error: "Invalid mapId" }, { status: 400 })
    }

    // Récupérer le nickname pour l'identité
    let nickname = "?"
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { nickname: true, isSystem: true },
        })
        // Les comptes système ne broadcast pas (compte test_sartay@local.dev)
        if (user?.isSystem) {
            return NextResponse.json({ ok: true, published: false, reason: "System account" })
        }
        nickname = user?.nickname ?? "?"
    } catch (e) {
        console.warn("[broadcast] user lookup failed", e)
    }

    // Construire le payload (on filtre ce que le client peut envoyer)
    const payload = {
        type,
        userId,
        nickname,
        mapId,
        posX: typeof body.posX === "number" ? body.posX : undefined,
        posY: typeof body.posY === "number" ? body.posY : undefined,
        direction: typeof body.direction === "string" ? body.direction : undefined,
        targetUserId: typeof body.targetUserId === "string" ? body.targetUserId : undefined,
        cinematicId: typeof body.cinematicId === "string" ? body.cinematicId : undefined,
        timestamp: now,
    }

    const result = await publishToGamebook(mapId, payload)
    return NextResponse.json({ ok: result.ok, published: result.published })
}
