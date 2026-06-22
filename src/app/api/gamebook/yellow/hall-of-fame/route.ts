// src/app/api/gamebook/yellow/hall-of-fame/route.ts
//
// Nexus Jaune Éclair — HALL OF FAME de la Ligue (partagé entre tous les joueurs).
//  POST : un joueur signale son SACRE (victoire sur LE MAÎTRE) → enregistre son équipe gelée
//         dans LeagueChampion, PUIS récompense tous les AUTRES joueurs (LeagueEnergyGrant :
//         +1/3 de leur quota, montant calculé côté client à la réclamation).
//  GET  : renvoie la liste des champions (du plus récent au plus ancien) pour le menu START.
//
// NB : on passe par (prisma as any).leagueChampion / .leagueEnergyGrant comme la route duel-gift/ →
// le code COMPILE avant `npm run db:push` (qui crée les tables ET régénère le client). Les try/catch
// rendent la feature NEUTRE tant que les tables n'existent pas.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled, YELLOW_CHAPTER_ID } from "@/lib/gamebook/yellow/featureFlag"

export const dynamic = "force-dynamic"

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

// Liste des champions (Hall of Fame partagé), du plus récent au plus ancien.
export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const lc = (prisma as any).leagueChampion // table gated (cf. duel-gift/), créée par db:push
        const rows = (await lc.findMany({
            orderBy: { wonAt: "desc" },
            take: 50,
            select: { nickname: true, team: true, wonAt: true },
        })) as { nickname: string; team: string; wonAt: Date }[]
        const champions = rows.map((r) => {
            let team: unknown = []
            try { team = JSON.parse(r.team) } catch { team = [] }
            return { nickname: r.nickname, wonAt: r.wonAt, team }
        })
        return NextResponse.json({ ok: true, champions })
    } catch {
        return NextResponse.json({ ok: true, champions: [] }) // tables pas encore créées → neutre
    }
}

// Un joueur signale son sacre → on grave son équipe + on récompense tous les autres joueurs.
export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { team?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    // L'équipe est gelée côté client (ChampionMon[]) ; on la stocke telle quelle (bornée), sans la croire pour autre chose.
    const team = Array.isArray(body.team) ? body.team.slice(0, 6) : []

    try {
        const lc = (prisma as any).leagueChampion // tables gated, créées par db:push
        const eg = (prisma as any).leagueEnergyGrant
        // Pseudo du champion TRUSTÉ serveur (jamais le client).
        const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true } })
        if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 401 })

        await lc.create({ data: { userId: auth.userId, nickname: me.nickname, team: JSON.stringify(team) } })

        // RÉCOMPENSE CROISÉE : tous les AUTRES joueurs ayant une partie Nexus Jaune (ligne GamebookProgress).
        const others = (await (prisma as any).gamebookProgress.findMany({
            where: { chapterId: YELLOW_CHAPTER_ID, userId: { not: auth.userId } },
            select: { userId: true },
        })) as { userId: string }[]
        // Anti-stacking : pas de second don NON réclamé de MOI vers la même cible.
        const pending = (await eg.findMany({
            where: { fromUserId: auth.userId, claimed: false },
            select: { toUserId: true },
        })) as { toUserId: string }[]
        const blocked = new Set(pending.map((p) => p.toUserId))
        const targets = others.map((o) => o.userId).filter((id) => !blocked.has(id))
        if (targets.length > 0) {
            await eg.createMany({
                data: targets.map((toUserId) => ({ toUserId, fromUserId: auth.userId, fromNickname: me.nickname })),
            })
        }
        return NextResponse.json({ ok: true, granted: targets.length })
    } catch {
        return NextResponse.json({ ok: true, skipped: "no-table" }) // tables pas encore créées → neutre
    }
}
