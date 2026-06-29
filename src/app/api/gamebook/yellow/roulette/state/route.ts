// GET /api/gamebook/yellow/roulette/state
//
// État autoritatif de la roulette MULTIJOUEUR : manche active (timer), mises de tous les joueurs,
// et manches récemment résolues (révélation + réconciliation des gains côté client).
// La résolution PARESSEUSE de la manche expirée se fait ici (au 1er accès après `closesAt`).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getRouletteState } from "@/lib/gamebook/yellow/roulette/server"

export const dynamic = "force-dynamic"

export async function GET() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const state = await getRouletteState()
        return NextResponse.json(state)
    } catch (e) {
        console.warn("[roulette/state] failed", e)
        return NextResponse.json({ error: "state_failed" }, { status: 500 })
    }
}
