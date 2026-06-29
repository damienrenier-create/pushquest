// POST /api/gamebook/yellow/roulette/bet
//   body: { roundId: string, bets: Array<{ type, numbers, chips, zoneId }> }
//
// Enregistre (REMPLACE) les mises du joueur pour la manche active. L'identité (userId + nickname)
// vient de la session — jamais du client. Diffuse un event Pusher `bet:placed` (best-effort) pour
// que les autres voient la mise en direct ; le polling /state reste la source de vérité.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { placeBets, publishRoulette } from "@/lib/gamebook/yellow/roulette/server"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    let body: { roundId?: unknown; bets?: unknown; luck?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const roundId = typeof body.roundId === "string" ? body.roundId : ""
    if (!roundId) return NextResponse.json({ error: "missing_round" }, { status: 400 })

    let nickname = "?"
    try {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } })
        nickname = user?.nickname ?? "?"
    } catch { /* nickname best-effort */ }

    try {
        const res = await placeBets(userId, nickname, roundId, body.bets, body.luck)
        void publishRoulette("bet:placed", { userId, nickname, staked: res.staked, roundId })
        return NextResponse.json(res)
    } catch (e) {
        const code = e instanceof Error ? e.message : "bet_failed"
        const status = code === "round_closed" ? 409 : 400
        return NextResponse.json({ error: code }, { status })
    }
}
