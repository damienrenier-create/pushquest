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
            take: 200,
            select: { userId: true, nickname: true, team: true, wonAt: true, world: true },
        })) as { userId: string; nickname: string; team: string; wonAt: Date; world: string | null }[]
        // Les sacres de FUSION vivent dans la même table (world "fusion:*") mais ont leur propre onglet
        //   (fusion-hall-of-fame) → on les EXCLUT ici pour ne pas polluer le HoF de la Ligue classique.
        const filtered = rows.filter((r) => !(r.world ?? "").startsWith("fusion:")).slice(0, 150)
        // AVATARS COURANTS : un reflet run-2 (PNJ-joueur de la Grotte) doit afficher le SKIN ACTUEL du joueur
        //   (chosenAvatar), pas un Red générique. On joint GamebookProgress.flags par userId (best-effort).
        const uids = [...new Set(filtered.map((r) => r.userId).filter(Boolean))]
        const avatarByUid = new Map<string, string>()
        try {
            const saves = (await (prisma as any).gamebookProgress.findMany({
                where: { chapterId: YELLOW_CHAPTER_ID, userId: { in: uids } },
                select: { userId: true, flags: true },
            })) as { userId: string; flags: unknown }[]
            for (const s of saves) {
                const m = JSON.stringify(s.flags ?? {}).match(/"chosenAvatar":\s*"([^"]+)"/)
                if (m) avatarByUid.set(s.userId, m[1])
            }
        } catch { /* best-effort : pas d'avatar, on retombe sur le comportement d'avant */ }
        const champions = filtered.map((r) => {
            let team: unknown = []
            try { team = JSON.parse(r.team) } catch { team = [] }
            return { userId: r.userId, nickname: r.nickname, wonAt: r.wonAt, team, world: r.world ?? "live", avatar: avatarByUid.get(r.userId) ?? null } // world : run 1/2/3 (défaut live)
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

    let body: { team?: unknown; world?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    // L'équipe est gelée côté client (ChampionMon[]) ; on la stocke telle quelle (bornée), sans la croire pour autre chose.
    const team = Array.isArray(body.team) ? body.team.slice(0, 6) : []
    // Run du sacre (whitelist stricte, défaut "live") → HoF Ligue séparé par run.
    const world = body.world === "ngplus" || body.world === "run3" ? body.world : "live"

    try {
        const lc = (prisma as any).leagueChampion // tables gated, créées par db:push
        const eg = (prisma as any).leagueEnergyGrant
        // Pseudo du champion TRUSTÉ serveur (jamais le client).
        const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true } })
        if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 401 })

        await lc.create({ data: { userId: auth.userId, nickname: me.nickname, team: JSON.stringify(team), world } })
        // Nb total de sacres de CE joueur (= nb de lignes) → le client débloque la CT Souffle Primordial à 10.
        const wins = (await lc.count({ where: { userId: auth.userId } })) as number

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
        // NOTIF PushQuest — au 1er sacre seulement (anti-spam sur re-sacre) : annonce sur le Wall, vue par
        // TOUS les potes ET par Mools/le créateur (→ générer le sprite du Daemon créé). Best-effort, jamais
        // bloquante (WallMessage est une table standard, non gated). Le prompt sprite privé = toast Nexus.
        if (wins === 1) {
            try { await prisma.wallMessage.create({ data: { userId: auth.userId, content: `🏆 ${me.nickname} a terminé la Ligue Jaune Éclair ! 🎉` } }) } catch { /* best-effort */ }
        }
        return NextResponse.json({ ok: true, granted: targets.length, wins })
    } catch {
        return NextResponse.json({ ok: true, skipped: "no-table" }) // tables pas encore créées → neutre
    }
}
