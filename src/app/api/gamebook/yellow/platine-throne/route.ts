// src/app/api/gamebook/yellow/platine-throne/route.ts
//
// Nexus Jaune Éclair — LE TRÔNE (palier PLATINE de la Ligue de Fusion).
//  GET  : l'état du couloir — le MAÎTRE en titre (équipe figée, skin, points, ancienneté) + les salles des
//         champions OR, déjà sélectionnées (8 plus puissantes) et rangées par ancienneté de sacre.
//  POST : « claim » (le joueur a traversé tout le couloir → il prend la place) ou « fail » (il est tombé →
//         le tenant marque +1).
//
// Stockage : LeagueChampion, AUCUNE migration.
//   • les salles = world "fusion:or" (déjà gravées par fusion-hall-of-fame au sacre OR) ;
//   • le trône   = world "platine", UNE LIGNE PAR JOUEUR SACRÉ (et non plus une ligne unique écrasée) : le
//     palier a un CLASSEMENT (Empereur = le plus de points), donc chaque Maître garde sa fiche même après
//     avoir perdu la chaise. Le tenant du moment = la ligne au `wonAt` le plus récent.
//     ⚠️ SANS le préfixe "fusion:", sinon la route fusion-hall-of-fame le
//     ramasserait et ferait un JSON.parse en attendant un TABLEAU, alors que le trône est un OBJET.
//
// Comme partout dans ce chapitre, le client est autoritaire sur SON résultat de combat (les saves le sont déjà) ;
// le serveur ne fait pas confiance au client sur l'IDENTITÉ (pseudo relu en base) ni sur le CRÉDIT (un tenant ne
// peut pas se donner de points à lui-même).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled, YELLOW_CHAPTER_ID } from "@/lib/gamebook/yellow/featureFlag"
import {
    PLATINE_THRONE_WORLD, decodeThrone, encodeThrone, claimThrone, renewThrone, awardFailurePoint, reignDays,
    rankThrones, throneTitle, type ThroneEntry,
} from "@/lib/gamebook/yellow/data/platineThrone"
import { buildPlatineCorridor, type PlatineChampion } from "@/lib/gamebook/yellow/data/platineArena"

export const dynamic = "force-dynamic"

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

type ThroneRow = { id: string; userId: string; nickname: string; team: string; wonAt: Date }

/** TOUTES les fiches de Maître, le dernier sacré en tête. `[0]` est donc le TENANT (celui qu'on affronte en
 *  dernière salle) ; les suivants sont d'anciens Maîtres qui gardent leurs points. */
async function readThroneRows(lc: any): Promise<ThroneRow[]> {
    return (await lc.findMany({
        where: { world: PLATINE_THRONE_WORLD },
        orderBy: { wonAt: "desc" },
        take: 50,
        select: { id: true, userId: true, nickname: true, team: true, wonAt: true },
    })) as ThroneRow[]
}

/** Décode les fiches en entrées de classement, en jetant celles dont le payload est illisible. */
function toEntries(rows: ThroneRow[]): ThroneEntry[] {
    const out: ThroneEntry[] = []
    for (const r of rows) {
        const slot = decodeThrone(r.team)
        if (slot) out.push({ userId: r.userId, nickname: r.nickname, slot })
    }
    return out
}

export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const lc = (prisma as any).leagueChampion
        // Les SALLES : sacres OR gravés au fil de l'eau. La sélection (8 plus fortes) et l'ordre (ancienneté)
        //   sont faits par le module partagé → même résultat côté client et côté serveur.
        const orRows = (await lc.findMany({
            where: { world: "fusion:or" },
            take: 150,
            select: { userId: true, nickname: true, team: true, wonAt: true },
        })) as { userId: string; nickname: string; team: string; wonAt: Date }[]
        // SKINS — le sacre OR n'archive PAS l'avatar (seulement l'équipe). On le JOINT donc à la lecture, sur la
        //   save du joueur, exactement comme le fait hall-of-fame pour les PNJ-joueurs. Conséquence assumée : c'est
        //   le skin ACTUEL du champion, pas celui du jour de son sacre — si le joueur se rhabille, son souvenir
        //   change de tenue. Best-effort : une save illisible laisse simplement le PNJ sans skin (repli emoji).
        const avatarByUser = new Map<string, string>()
        try {
            const ids = [...new Set(orRows.map((r) => r.userId))]
            const progs = (await (prisma as any).gamebookProgress.findMany({
                where: { chapterId: YELLOW_CHAPTER_ID, userId: { in: ids } },
                select: { userId: true, flags: true },
            })) as { userId: string; flags: any }[]
            for (const p of progs) {
                const av = p.flags?.chosenAvatar
                if (typeof av === "string" && av) avatarByUser.set(p.userId, av.slice(0, 200))
            }
        } catch { /* saves illisibles → aucun skin, jamais d'erreur */ }

        const all: PlatineChampion[] = orRows.map((r) => {
            let team: any = []
            try { team = JSON.parse(r.team) } catch { team = [] }
            return {
                userId: r.userId, nickname: r.nickname,
                wonAt: new Date(r.wonAt).toISOString(),
                team: Array.isArray(team) ? team : [],
                avatar: avatarByUser.get(r.userId),
            }
        })
        const rooms = buildPlatineCorridor(all)

        // LE TENANT = la fiche la plus récemment sacrée. C'est LUI qu'on affronte en dernière salle (👑), même
        //   s'il n'est pas en tête du classement : l'Empereur, lui, est celui qui a repoussé le plus de monde.
        const rows = await readThroneRows(lc)
        const now = new Date()
        const holder = rows[0] ?? null
        const slot = holder ? decodeThrone(holder.team) : null
        const throne = holder && slot
            ? {
                userId: holder.userId, nickname: holder.nickname,
                points: slot.points, sinceAt: slot.sinceAt,
                reignDays: reignDays(slot, now),
                team: slot.team, avatar: slot.avatar,
            }
            : null
        const ranking = rankThrones(toEntries(rows), holder?.userId ?? null, now).map((r) => ({
            userId: r.userId, nickname: r.nickname, rank: r.rank,
            points: r.slot.points, reigns: r.slot.reigns, days: r.days,
            isHolder: r.isHolder, isEmperor: r.isEmperor, title: throneTitle(r),
            avatar: r.slot.avatar,
        }))
        return NextResponse.json({ ok: true, throne, ranking, rooms })
    } catch {
        return NextResponse.json({ ok: true, throne: null, ranking: [], rooms: [] }) // table absente → neutre
    }
}

export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { action?: unknown; team?: unknown; avatar?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const action = body.action === "claim" || body.action === "fail" ? body.action : null
    if (!action) return NextResponse.json({ error: "Bad action" }, { status: 400 })

    try {
        const lc = (prisma as any).leagueChampion
        const rows = await readThroneRows(lc)
        const row = rows[0] ?? null                       // le TENANT (dernier sacré)
        const current = row ? decodeThrone(row.team) : null

        // ── ÉCHEC : le tenant marque +1. Rien à faire si le trône est vide, et JAMAIS de crédit à soi-même
        //    (sinon il suffirait de perdre en boucle contre sa propre salle).
        if (action === "fail") {
            if (!row || !current) return NextResponse.json({ ok: true, skipped: "empty-throne" })
            const next = awardFailurePoint(current, auth.userId, row.userId)
            if (next === current) return NextResponse.json({ ok: true, skipped: "self" })
            await lc.update({ where: { id: row.id }, data: { team: encodeThrone(next) } })
            return NextResponse.json({ ok: true, points: next.points })
        }

        // ── SACRE : le challenger prend la place. Le pseudo est relu EN BASE (jamais cru depuis le client).
        const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true } })
        if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 401 })
        const team = Array.isArray(body.team) ? body.team.slice(0, 6) : []
        const avatar = typeof body.avatar === "string" ? body.avatar.slice(0, 200) : undefined
        const slot = claimThrone(team as any, avatar, new Date())

        // UNE FICHE PAR JOUEUR. Un ancien Maître qui reprend la chaise MET À JOUR la sienne et GARDE ses points
        //   (renewThrone) : le classement des Empereurs a de la mémoire. `wonAt` est repassé explicitement (ce
        //   n'est pas un @updatedAt) — c'est lui qui désigne le tenant et fait repartir l'ancienneté.
        const mine = rows.find((r) => r.userId === auth.userId) ?? null
        const prev = mine ? decodeThrone(mine.team) : null
        const next = prev ? renewThrone(prev, team as any, avatar, new Date()) : slot
        if (mine) {
            await lc.update({ where: { id: mine.id }, data: { nickname: me.nickname, team: encodeThrone(next), wonAt: new Date() } })
        } else {
            await lc.create({ data: { userId: auth.userId, nickname: me.nickname, team: encodeThrone(next), world: PLATINE_THRONE_WORLD } })
        }
        return NextResponse.json({ ok: true, throne: { nickname: me.nickname, points: next.points, reigns: next.reigns, sinceAt: next.sinceAt } })
    } catch {
        return NextResponse.json({ ok: true, skipped: "no-table" }) // table absente → neutre
    }
}
