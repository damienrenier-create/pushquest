// src/app/api/gamebook/yellow/arena-champions/route.ts
//
// Nexus Jaune Éclair — HALL OF FAME PAR ARÈNE (partagé entre tous les joueurs).
//  POST : un joueur signale la CONQUÊTE d'une arène (badge gagné) → grave son équipe gelée
//         dans ArenaChampion (pour cette arène). Pas de récompense croisée (≠ Ligue).
//  GET  : renvoie les champions d'arène (les plus récents d'abord), pour l'écran menu.
//
// Même pattern gaté que hall-of-fame/ : (prisma as any).arenaChampion → COMPILE avant db:push,
// et les try/catch rendent la feature NEUTRE tant que la table n'existe pas.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"

export const dynamic = "force-dynamic"

const VALID_BADGES = new Set(["feu", "plante", "eau", "roche", "elec"])

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

// Liste des champions d'arène (toutes arènes), du plus récent au plus ancien. Le client regroupe par badge.
export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const ac = (prisma as any).arenaChampion // table gated (créée par db:push)
        const rows = (await ac.findMany({
            orderBy: { wonAt: "desc" },
            take: 300,
            select: { nickname: true, badgeId: true, team: true, wonAt: true },
        })) as { nickname: string; badgeId: string; team: string; wonAt: Date }[]
        const champions = rows.map((r) => {
            let team: unknown = []
            try { team = JSON.parse(r.team) } catch { team = [] }
            return { nickname: r.nickname, badgeId: r.badgeId, wonAt: r.wonAt, team }
        })
        return NextResponse.json({ ok: true, champions })
    } catch {
        return NextResponse.json({ ok: true, champions: [] }) // table pas encore créée → neutre
    }
}

// Un joueur signale la conquête d'une arène → on grave son équipe gelée pour cette arène.
export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { badgeId?: unknown; team?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const badgeId = typeof body.badgeId === "string" ? body.badgeId : ""
    if (!VALID_BADGES.has(badgeId)) return NextResponse.json({ error: "Invalid badge" }, { status: 400 })
    const team = Array.isArray(body.team) ? body.team.slice(0, 6) : []

    try {
        const ac = (prisma as any).arenaChampion // table gated, créée par db:push
        const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true } })
        if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 401 })
        await ac.create({ data: { userId: auth.userId, nickname: me.nickname, badgeId, team: JSON.stringify(team) } })
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ ok: true, skipped: "no-table" }) // table pas encore créée → neutre
    }
}
