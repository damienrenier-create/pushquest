// src/app/api/gamebook/yellow/dome-hall-of-fame/route.ts
//
// Nexus Jaune Éclair — PANTHÉON DU DÔME (partagé entre tous les joueurs de la Zone de Combat).
//  POST : un joueur signale un nouveau TITRE au Dôme → grave son équipe FIGÉE + le palier (BRONZE…MAITRE…DAN_4).
//         AUCUNE récompense croisée (comme le Hall of Fame de la Ligue de Fusion).
//  GET  : renvoie les sacres du Dôme (du plus récent au plus ancien) pour l'onglet DÔME du Hall of Fame.
//
// Stockage : on RÉUTILISE la table LeagueChampion avec world = "dome:<tier>" → AUCUNE migration (save-safe). Le team
// stocke des ChampionMon[] (Daemons RÉELS résolvables par speciesId, comme la Ligue classique). Passe par
// (prisma as any).leagueChampion (gated, cf. hall-of-fame/) → neutre tant que la table n'existe pas.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"
import { DOME_TIERS } from "@/lib/gamebook/yellow/frontier/domeTypes"

export const dynamic = "force-dynamic"

const TIERS = new Set<string>(DOME_TIERS as readonly string[])

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

// Liste des sacres du Dôme (Panthéon partagé), du plus récent au plus ancien.
export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const lc = (prisma as any).leagueChampion
        const rows = (await lc.findMany({
            where: { world: { startsWith: "dome:" } },
            orderBy: { wonAt: "desc" },
            take: 200,
            select: { userId: true, nickname: true, team: true, wonAt: true, world: true },
        })) as { userId: string; nickname: string; team: string; wonAt: Date; world: string }[]
        const champions = rows.map((r) => {
            let team: unknown = []
            try { team = JSON.parse(r.team) } catch { team = [] }
            return { userId: r.userId, nickname: r.nickname, wonAt: r.wonAt, team, tier: r.world.replace("dome:", "") }
        })
        return NextResponse.json({ ok: true, champions })
    } catch {
        return NextResponse.json({ ok: true, champions: [] }) // table pas encore créée → neutre
    }
}

// Un joueur signale un nouveau titre au Dôme → on grave son équipe figée + le palier. Pas de récompense croisée.
export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { team?: unknown; tier?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const tier = typeof body.tier === "string" && TIERS.has(body.tier) ? body.tier : null
    if (!tier) return NextResponse.json({ error: "Bad tier" }, { status: 400 })
    // Équipe gelée côté client (ChampionMon[]) ; stockée telle quelle (bornée à 6), non crue pour autre chose.
    const team = Array.isArray(body.team) ? body.team.slice(0, 6) : []

    try {
        const lc = (prisma as any).leagueChampion
        const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true } })
        if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 401 })
        await lc.create({ data: { userId: auth.userId, nickname: me.nickname, team: JSON.stringify(team), world: `dome:${tier}` } })
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ ok: true, skipped: "no-table" }) // table pas encore créée → neutre
    }
}
