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

/** BORNAGE DE L'ÉQUIPE DU TRÔNE. Ces chimères sont REJOUÉES telles quelles (frozenStats, aucun recalcul) par
 *  tous les challengers : une équipe bricolée à 9999 en chaque stat rendrait le trône imprenable À VIE, et
 *  c'est un abus qui touche les AUTRES joueurs, pas la save du tricheur. On borne donc à l'écriture — c'est
 *  la seule occasion, ensuite plus personne ne repasse dessus. Renvoie [] si rien d'exploitable.
 *  (Plafonds larges à dessein : une fusion dorée de palier platine tourne autour de 700-900 par stat.) */
function sanitizeThroneTeam(raw: unknown): any[] {
    if (!Array.isArray(raw)) return []
    const num = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)))
    const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "")
    const out: any[] = []
    for (const m of raw.slice(0, 6)) {
        if (!m || typeof m !== "object") continue
        const o = m as Record<string, unknown>
        const st = (o.stats ?? {}) as Record<string, unknown>
        const name = str(o.name, 40)
        if (!name) continue // sans nom, la salle ne peut rien afficher : on préfère l'écarter
        out.push({
            name, sprite: str(o.sprite, 300),
            types: Array.isArray(o.types) ? o.types.slice(0, 2).map((t) => str(t, 20)) : [],
            level: Math.max(1, Math.min(100, Math.floor(Number(o.level) || 1))),
            stats: { hp: num(st.hp, 2000), atk: num(st.atk, 1500), def: num(st.def, 1500), spe: num(st.spe, 1500), spc: num(st.spc, 1500) },
            moves: Array.isArray(o.moves) ? o.moves.slice(0, 4).map((x) => str(x, 40)) : [],
            aId: o.aId ? str(o.aId, 40) : undefined,
            bId: o.bId ? str(o.bId, 40) : undefined,
        })
    }
    return out
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
        // ⚠️ AUCUN FILTRE « SOI-MÊME », ET C'EST VOULU (décision Sartay) : on affronte TA PROPRE SALLE OR, ton
        //   ancien soi, exactement comme la salle dorée du run 2. Il faut avoir l'OR pour venir ici, donc tout
        //   le monde a sa ligne « fusion:or » — le PNJ portera ton pseudo et ton skin, et s'excusera devant
        //   toi-même. C'est le gag, pas un oubli : ne pas « corriger » en ajoutant un filtre sur auth.userId.
        const rooms = buildPlatineCorridor(all)

        // LE TENANT = la fiche la plus récemment sacrée. C'est LUI qu'on affronte en dernière salle (👑), même
        //   s'il n'est pas en tête du classement : l'Empereur, lui, est celui qui a repoussé le plus de monde.
        const rows = await readThroneRows(lc)
        const now = new Date()
        const holder = rows[0] ?? null
        const slot = holder ? decodeThrone(holder.team) : null
        // Un trône à l'ÉQUIPE VIDE est traité comme VACANT — même filtre que pour les salles (platineArena).
        //   Sinon la dernière étape du couloir existe mais ne peut pas se construire : le joueur reçoit « le
        //   souvenir vacille », son gauntlet est jeté, et PLUS PERSONNE du groupe ne peut boucler le palier
        //   tant que la ligne n'est pas réparée à la main en base.
        const throne = holder && slot && slot.team.length > 0
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
        // ⚠️ NE JAMAIS répondre « ok » ici. Un hoquet de Neon (cold start, limite de connexions) rendait un
        //   couloir VIDE que le client acceptait : le palier valait alors ACE tout seul, donc la victoire sur
        //   ACE était la dernière étape → sacre en UN combat, et le vrai Maître se faisait détrôner sans
        //   combat. Un échec doit se dire : le client sait déjà afficher « couloir indisponible ».
        return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 503 })
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
            if (awardFailurePoint(current, auth.userId, row.userId) === current) return NextResponse.json({ ok: true, skipped: "self" })
            // TRANSACTION. Le point vit dans un JSON : l'écriture REMPLACE l'objet entier. Sans relire dans la
            //   même transaction, deux challengers qui tombent dans la même seconde en perdaient un — et pire,
            //   un « fail » en vol pendant que le tenant reprend la chaise réécrivait l'équipe, la date de règne
            //   et le compteur de règnes dans leur ANCIENNE valeur.
            const points = await prisma.$transaction(async (tx: any) => {
                const fresh = await tx.leagueChampion.findUnique({ where: { id: row.id }, select: { userId: true, team: true } })
                const slot = fresh ? decodeThrone(fresh.team) : null
                if (!fresh || !slot) return null
                const bumped = awardFailurePoint(slot, auth.userId, fresh.userId)
                if (bumped === slot) return null
                await tx.leagueChampion.update({ where: { id: row.id }, data: { team: encodeThrone(bumped) } })
                return bumped.points
            })
            if (points === null) return NextResponse.json({ ok: true, skipped: "self" })
            return NextResponse.json({ ok: true, points })
        }

        // ── SACRE : le challenger prend la place. Le pseudo est relu EN BASE (jamais cru depuis le client).
        const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true } })
        if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 401 })
        const team = sanitizeThroneTeam(body.team)
        // Un sacre sans équipe exploitable n'est PAS écrit : il graverait une dernière salle infranchissable
        //   pour tout le groupe. Mieux vaut refuser le sacre (le joueur refera le couloir) que bloquer le palier.
        if (team.length === 0) return NextResponse.json({ ok: false, reason: "empty-team" }, { status: 400 })
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
        // ⚠️ NE JAMAIS répondre « ok » ici non plus. Un sacre, c'est 20-30 minutes de couloir SANS reprise :
        //   avaler l'erreur laissait le joueur croire qu'il était Maître alors que rien n'était écrit. Le client
        //   relit la réponse, retente, et met le sacre en attente pour le rejouer au prochain chargement.
        return NextResponse.json({ ok: false, reason: "write-failed" }, { status: 500 })
    }
}
