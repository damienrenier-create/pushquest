// src/app/api/gamebook/yellow/frontier/route.ts
//
// ZONE DE COMBAT — persistance serveur du profil Frontier (solde de Jetons de Combat + records + symboles).
//  GET  : renvoie le profil du joueur (défauts si absent / table pas encore créée).
//  POST : { action: "recordRun" }  → crédite des JC + met à jour le meilleur record d'une salle (+symbole).
//         { action: "spend" }      → débite des JC (boutique), refuse si solde insuffisant.
//
// Pattern GATÉ `(prisma as any).frontierProfile` (cf. duel-gift / hall-of-fame) : COMPILE avant
// `npm run db:push` (qui crée la table FrontierProfile). Try/catch → NEUTRE tant que la table n'existe pas.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled, YELLOW_CHAPTER_ID } from "@/lib/gamebook/yellow/featureFlag"
import { replayCost } from "@/lib/gamebook/yellow/data/replayCost"
import { buildFrontierBoard, sanitizeFrontierTeam, sanitizeLevelRule } from "@/lib/gamebook/yellow/frontier/frontierBoard"

export const dynamic = "force-dynamic"

const DEFAULTS = { jc: 0, towerBest: 0, factoryBest: 0, domeBest: 0, symbols: [] as string[] }
/** Plafond d'un DON de jetons, PAR APPEL (couloir platine : 6 Daemons × 50 JC).
 *
 *  ⚠️ Ce plafond ne protège PAS d'une boucle — le commentaire précédent l'affirmait, à tort. Rien n'empêche
 *  d'appeler la route cent fois depuis une console. Ce qui limite réellement l'abus, c'est la PORTE ci-dessous
 *  (il faut avoir ouvert le palier platine, donc bouclé l'OR) et le fait que le jeton n'a de valeur que dans
 *  ce jeu, entre joueurs qui se connaissent. Un vrai quota journalier demanderait une colonne de plus ;
 *  si le besoin se présente, c'est la migration additive à faire — pas un plafond par appel. */
const GRANT_MAX = 300
/** Sans ce marqueur dans la save, le joueur n'a rien à faire dans le couloir platine — donc rien à encaisser. */
const PLATINE_OPEN_MARKER = "fusleague_platine_open"

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

function pickProfile(p: any) {
    return {
        jc: p?.jc ?? 0,
        towerBest: p?.towerBest ?? 0,
        factoryBest: p?.factoryBest ?? 0,
        domeBest: p?.domeBest ?? 0,
        symbols: Array.isArray(p?.symbols) ? p.symbols : [],
        replaysUsed: p?.replaysUsed ?? 0,
    }
}

// SELECT EXPLICITE des seules colonnes utilisées ici (toutes présentes en base de longue date). ⚠️ ANTI-BUG « faux
//   zéro JC » : un findUnique SANS select fait un SELECT * → si le client Prisma (régénéré au build) connaît une NOUVELLE
//   colonne pas encore migrée (db:push en retard), la lecture PLANTE et le catch renvoie jc:0 pour TOUS. Le select fige
//   les colonnes lues → immunise la lecture du JC contre tout futur ajout de schéma. NE JAMAIS y mettre une colonne récente.
const PROFILE_SELECT = { jc: true, towerBest: true, factoryBest: true, domeBest: true, symbols: true, replaysUsed: true } as const

// STATS PARTAGÉES Tour / Usine (onglet 📊 Stats, demande Sartay 19/10/2026) : le meilleur record de chaque joueur, avec
//   l'équipe gravée au moment de ce record. Comptes système écartés. Neutre (listes vides) si la table manque.
async function frontierBoard(meId: string) {
    try {
        const fp = (prisma as any).frontierProfile
        const rows = (await fp.findMany({
            where: { OR: [{ towerBest: { gt: 0 } }, { factoryBest: { gt: 0 } }] },
            select: { userId: true, towerBest: true, factoryBest: true },
        })) as { userId: string; towerBest: number; factoryBest: number }[]
        const ids = rows.map((r) => r.userId)
        const teams = new Map<string, { towerTeam: string | null; factoryTeam: string | null }>()
        try {
            const t = (await fp.findMany({ where: { userId: { in: ids } }, select: { userId: true, towerTeam: true, factoryTeam: true } })) as { userId: string; towerTeam: string | null; factoryTeam: string | null }[]
            for (const x of t) teams.set(x.userId, x)
        } catch { /* colonnes pas encore créées (avant db:push) → classement sans équipes */ }
        const users = await prisma.user.findMany({ where: { id: { in: ids }, isSystem: false }, select: { id: true, nickname: true } })
        const nick = new Map(users.map((u) => [u.id, u.nickname]))
        const real = rows.filter((r) => nick.has(r.userId))
        return {
            tower: buildFrontierBoard(real.map((r) => ({ userId: r.userId, best: r.towerBest, engraved: teams.get(r.userId)?.towerTeam })), (id) => nick.get(id), meId),
            factory: buildFrontierBoard(real.map((r) => ({ userId: r.userId, best: r.factoryBest, engraved: teams.get(r.userId)?.factoryTeam })), (id) => nick.get(id), meId),
        }
    } catch {
        return { tower: [], factory: [] }
    }
}

export async function GET(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    if (req.nextUrl.searchParams.get("board")) return NextResponse.json({ ok: true, ...(await frontierBoard(auth.userId)) })
    try {
        const fp = (prisma as any).frontierProfile
        const p = await fp.findUnique({ where: { userId: auth.userId }, select: PROFILE_SELECT })
        return NextResponse.json({ ok: true, profile: p ? pickProfile(p) : { ...DEFAULTS } })
    } catch {
        return NextResponse.json({ ok: true, profile: { ...DEFAULTS } }) // table pas encore créée → neutre
    }
}

const BEST_FIELD: Record<string, "towerBest" | "factoryBest" | "domeBest"> = {
    TOWER: "towerBest", FACTORY: "factoryBest", DOME: "domeBest",
}

export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: any
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const action = typeof body?.action === "string" ? body.action : ""

    try {
        const fp = (prisma as any).frontierProfile

        // DON DE JETONS hors Zone de Combat (pot-de-vin des vaincus du couloir platine) : crédite SANS toucher
        //   au moindre record de salle — `recordRun` exige un mode connu et écrirait un meilleur score parasite.
        //   Montant PLAFONNÉ côté serveur : le client ne peut pas s'auto-attribuer n'importe quoi.
        if (action === "grant") {
            const amount = Math.max(0, Math.min(GRANT_MAX, Math.floor(Number(body.amount) || 0)))
            if (amount === 0) return NextResponse.json({ ok: true, jc: 0, skipped: "zero" })
            // PORTE : seul un joueur dont le palier platine est ouvert peut recevoir un pot-de-vin. La save est
            //   cliente-autoritaire, donc ce n'est pas un rempart — c'est une porte, et elle ferme le cas du
            //   joueur qui n'a jamais mis les pieds dans le couloir.
            const prog = await (prisma as any).gamebookProgress.findFirst({
                where: { chapterId: YELLOW_CHAPTER_ID, userId: auth.userId },
                select: { flags: true },
            })
            const markers = (prog?.flags as { defeatedTrainers?: unknown })?.defeatedTrainers
            if (!Array.isArray(markers) || !markers.includes(PLATINE_OPEN_MARKER)) {
                return NextResponse.json({ ok: false, reason: "not-eligible" }, { status: 403 })
            }
            // Crédit ATOMIQUE : un read-then-write perdait un don sur deux appels concurrents.
            const saved = await (prisma as any).frontierProfile.upsert({
                where: { userId: auth.userId },
                create: { userId: auth.userId, ...DEFAULTS, jc: amount },
                update: { jc: { increment: amount } },
                select: { jc: true },
            })
            return NextResponse.json({ ok: true, jc: saved.jc })
        }
        if (action === "recordRun") {
            const bestField = BEST_FIELD[String(body.mode)]
            if (!bestField) return NextResponse.json({ error: "Bad mode" }, { status: 400 })
            const streak = Math.max(0, Math.floor(Number(body.streak) || 0))
            const jcEarned = Math.max(0, Math.floor(Number(body.jcEarned) || 0))
            const symbol = typeof body.symbol === "string" ? body.symbol : null

            const existing = await fp.findUnique({ where: { userId: auth.userId }, select: PROFILE_SELECT })
            const cur = pickProfile(existing)
            const symbols = [...cur.symbols]
            if (symbol && !symbols.includes(symbol)) symbols.push(symbol)
            const data = {
                jc: cur.jc + jcEarned,
                [bestField]: Math.max(cur[bestField], streak),
                symbols,
            }
            const saved = await fp.upsert({
                where: { userId: auth.userId },
                create: { userId: auth.userId, ...data },
                update: data,
                select: PROFILE_SELECT,
            })
            // GRAVURE (stats partagées) : un NOUVEAU record de Tour / d'Usine grave l'équipe qui l'a établi. Séparée et
            //   best-effort : avant le db:push des colonnes, l'update échoue sans toucher au record déjà enregistré.
            const teamField = body.mode === "TOWER" ? "towerTeam" : body.mode === "FACTORY" ? "factoryTeam" : null
            if (teamField && streak > 0 && streak > cur[bestField]) {
                const team = sanitizeFrontierTeam(body.team)
                if (team.length) {
                    try {
                        await fp.update({ where: { userId: auth.userId }, data: { [teamField]: JSON.stringify({ streak, levelRule: sanitizeLevelRule(body.levelRule), team, at: new Date().toISOString() }) } })
                    } catch { /* colonne absente → record gardé, équipe non gravée */ }
                }
            }
            return NextResponse.json({ ok: true, profile: pickProfile(saved) })
        }

        if (action === "spend") {
            const amount = Math.max(0, Math.floor(Number(body.amount) || 0))
            const symbol = typeof body.symbol === "string" ? body.symbol : null
            const existing = await fp.findUnique({ where: { userId: auth.userId }, select: PROFILE_SELECT })
            const jc = existing?.jc ?? 0
            if (jc < amount) return NextResponse.json({ ok: false, reason: "insufficient", jc })
            const symbols = [...pickProfile(existing).symbols]
            if (symbol && !symbols.includes(symbol)) symbols.push(symbol) // achat d'un symbole de prestige (atomique)
            const saved = await fp.update({ where: { userId: auth.userId }, data: { jc: jc - amount, ...(symbol ? { symbols } : {}) }, select: PROFILE_SELECT })
            return NextResponse.json({ ok: true, jc: saved.jc, symbols: pickProfile(saved).symbols })
        }

        if (action === "replaySpend") {
            // REJEU (« run bis ») : coût JC CROISSANT (server-authoritative) selon replaysUsed (compteur GLOBAL).
            //   1er rejeu gratuit. Débit du coût + incrément du compteur, ATOMIQUES. Refus si solde insuffisant.
            const existing = await fp.findUnique({ where: { userId: auth.userId }, select: PROFILE_SELECT })
            const used = existing?.replaysUsed ?? 0
            const cost = replayCost(used)
            const jc = existing?.jc ?? 0
            if (jc < cost) return NextResponse.json({ ok: false, reason: "insufficient", jc, cost })
            const saved = await fp.upsert({
                where: { userId: auth.userId },
                create: { userId: auth.userId, jc: Math.max(0, jc - cost), replaysUsed: used + 1 },
                update: { jc: jc - cost, replaysUsed: used + 1 },
                select: PROFILE_SELECT,
            })
            return NextResponse.json({ ok: true, jc: saved.jc, replaysUsed: saved.replaysUsed, cost })
        }

        return NextResponse.json({ error: "Bad action" }, { status: 400 })
    } catch {
        return NextResponse.json({ ok: false, reason: "no-table" }) // table/champ pas encore créé → neutre (rejeu gratuit avant db:push)
    }
}
