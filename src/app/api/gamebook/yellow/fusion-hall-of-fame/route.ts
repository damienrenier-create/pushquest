// src/app/api/gamebook/yellow/fusion-hall-of-fame/route.ts
//
// Nexus Jaune Éclair — HALL OF FAME de la LIGUE DE FUSION (partagé entre tous les joueurs arrivés au Dôme).
//  POST : un joueur signale son SACRE (victoire sur le Dieu Spaghetti) → grave son roster de chimères FIGÉ
//         + le palier (bronze/argent/or). AUCUNE récompense croisée (contrairement à la Ligue classique).
//  GET  : renvoie les sacres de fusion (du plus récent au plus ancien) pour l'onglet FUSION du Hall of Fame.
//
// Stockage : on RÉUTILISE la table LeagueChampion avec world = "fusion:<tier>" → AUCUNE migration. Le team
// stocke des FusionChampionMon (nom/sprite/types/stats), pas des speciesId (une chimère est éphémère).
// Passe par (prisma as any).leagueChampion (gated, cf. hall-of-fame/) → neutre tant que la table n'existe pas.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled, YELLOW_CHAPTER_ID } from "@/lib/gamebook/yellow/featureFlag"

export const dynamic = "force-dynamic"

const TIERS = new Set(["bronze", "argent", "or"])

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

// Liste des sacres de fusion (Hall of Fame partagé), du plus récent au plus ancien.
export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const lc = (prisma as any).leagueChampion
        const rows = (await lc.findMany({
            where: { world: { startsWith: "fusion:" } },
            orderBy: { wonAt: "desc" },
            take: 150,
            select: { userId: true, nickname: true, team: true, wonAt: true, world: true },
        })) as { userId: string; nickname: string; team: string; wonAt: Date; world: string }[]
        const champions = rows.map((r) => {
            let team: unknown = []
            try { team = JSON.parse(r.team) } catch { team = [] }
            return { userId: r.userId, nickname: r.nickname, wonAt: r.wonAt, team, tier: r.world.replace("fusion:", "") }
        })
        return NextResponse.json({ ok: true, champions })
    } catch {
        return NextResponse.json({ ok: true, champions: [] }) // table pas encore créée → neutre
    }
}

// Un joueur signale son sacre de fusion → on grave son roster figé + le palier. Pas de récompense croisée.
export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { team?: unknown; tier?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const tier = typeof body.tier === "string" && TIERS.has(body.tier) ? body.tier : null
    if (!tier) return NextResponse.json({ error: "Bad tier" }, { status: 400 })
    // Roster gelé côté client (FusionChampionMon[]) ; stocké tel quel (borné à 6), non cru pour autre chose.
    const team = Array.isArray(body.team) ? body.team.slice(0, 6) : []

    try {
        const lc = (prisma as any).leagueChampion
        const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true } })
        if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 401 })
        await lc.create({ data: { userId: auth.userId, nickname: me.nickname, team: JSON.stringify(team), world: `fusion:${tier}` } })
        // RÉCOMPENSE CROISÉE (calquée sur la Ligue classique, cf. hall-of-fame/) : tous les AUTRES joueurs reçoivent
        //   un don d'énergie (+1/3 de LEUR quota, appliqué à la réclamation via hall-of-fame/energy — table partagée).
        //   Anti-stacking : pas de 2e don NON réclamé de MOI vers la même cible (la Ligue de Fusion est rejouable →
        //   évite le spam de dons en re-gagnant les paliers). Best-effort, neutre si la table n'existe pas.
        try {
            const eg = (prisma as any).leagueEnergyGrant
            const others = (await (prisma as any).gamebookProgress.findMany({ where: { chapterId: YELLOW_CHAPTER_ID, userId: { not: auth.userId } }, select: { userId: true } })) as { userId: string }[]
            const pending = (await eg.findMany({ where: { fromUserId: auth.userId, claimed: false }, select: { toUserId: true } })) as { toUserId: string }[]
            const blocked = new Set(pending.map((p) => p.toUserId))
            const targets = others.map((o) => o.userId).filter((id) => !blocked.has(id))
            if (targets.length > 0) await eg.createMany({ data: targets.map((toUserId) => ({ toUserId, fromUserId: auth.userId, fromNickname: me.nickname })) })
        } catch { /* table absente → neutre */ }
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ ok: true, skipped: "no-table" }) // table pas encore créée → neutre
    }
}
