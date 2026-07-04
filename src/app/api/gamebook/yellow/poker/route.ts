// GET  /api/gamebook/yellow/poker  → vue REDACTÉE du joueur (ses cartes seulement).
// POST /api/gamebook/yellow/poker  → { action: "join"|"act"|"sit"|"rebuy"|"next"|"leave", ... }
//
// Identité (userId + nickname) TOUJOURS depuis la session — jamais du client. Chaque mutation passe par
// le croupier serveur (verrou optimiste) qui diffuse un event Pusher ; le client re-fetch sa vue via GET.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { pokerState, pokerJoin, pokerAct, pokerSit, pokerLeave, pokerNextHand, pokerRebuy } from "@/lib/gamebook/yellow/poker/server"
import type { ActionKind, PokerAction } from "@/lib/gamebook/yellow/poker/engine"

export const dynamic = "force-dynamic"

const ACTION_KINDS: ActionKind[] = ["fold", "check", "call", "raise", "allin"]

async function sessionUserId(): Promise<string | null> {
    const session = await getServerSession(authOptions)
    return (session?.user as { id?: string } | undefined)?.id ?? null
}

export async function GET() {
    const userId = await sessionUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    try {
        return NextResponse.json(await pokerState(userId))
    } catch {
        return NextResponse.json({ error: "state_failed" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const userId = await sessionUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    let body: Record<string, unknown>
    try { body = (await req.json()) as Record<string, unknown> } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const action = typeof body.action === "string" ? body.action : ""

    let nickname = "?"
    try { const u = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } }); nickname = u?.nickname ?? "?" } catch { /* best-effort */ }

    try {
        switch (action) {
            case "join":
                return NextResponse.json(await pokerJoin(userId, nickname, Number(body.buyin)))
            case "act": {
                const mv = (body.move ?? {}) as { kind?: unknown; to?: unknown }
                const kind = mv.kind as ActionKind
                if (!ACTION_KINDS.includes(kind)) return NextResponse.json({ error: "bad_action_kind" }, { status: 400 })
                const move: PokerAction = { kind, to: mv.to != null ? Number(mv.to) : undefined }
                return NextResponse.json(await pokerAct(userId, move))
            }
            case "sit":
                return NextResponse.json(await pokerSit(userId, Boolean(body.out)))
            case "rebuy":
                return NextResponse.json(await pokerRebuy(userId, Number(body.amount)))
            case "next":
                return NextResponse.json(await pokerNextHand())
            case "leave":
                return NextResponse.json(await pokerLeave(userId))
            default:
                return NextResponse.json({ error: "unknown_action" }, { status: 400 })
        }
    } catch (e) {
        const code = e instanceof Error ? e.message : "poker_failed"
        return NextResponse.json({ error: code }, { status: 409 })
    }
}
