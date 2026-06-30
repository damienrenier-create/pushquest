// POST /api/gamebook/yellow/roulette/resolve
//   body: { roundId: string }
//
// "Lancer la balle" : le joueur se déclare PRÊT. Quand TOUS les parieurs de la manche sont prêts (ou le
// seul parieur en solo), le tirage se déclenche MAINTENANT, sans attendre le timer de 10 min. L'identité
// vient de la session — jamais du client. Le serveur ne reçoit QUE roundId : aucun numéro/gain ne
// transite depuis le client. La résolution (numéro tiré par le seed serveur secret, rig SECRET re-décidé
// en interne, fermeture atomique) est entièrement server-side. Aucun crédit serveur (custody cliente).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { markReadyAndResolve } from "@/lib/gamebook/yellow/roulette/server"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    let body: { roundId?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const roundId = typeof body.roundId === "string" ? body.roundId : ""
    if (!roundId) return NextResponse.json({ error: "missing_round" }, { status: 400 })

    const r = await markReadyAndResolve(userId, roundId)
    switch (r.status) {
        case "resolved": return NextResponse.json({ ok: true, resolved: true, result: r.result, ready: r.ready, total: r.total })
        case "waiting": return NextResponse.json({ ok: true, resolved: false, ready: r.ready, total: r.total })
        case "not_found": return NextResponse.json({ error: "not_found" }, { status: 404 })
        case "closed": return NextResponse.json({ error: "already_resolved" }, { status: 409 })
        case "no_bet": return NextResponse.json({ error: "no_bet" }, { status: 400 })
    }
}
