// src/lib/gamebook/yellow/roulette/server.ts
//
// Nexus Jaune Éclair — ROULETTE EU MULTIJOUEUR : LOGIQUE SERVEUR (autoritative).
// ⚠️ SERVER-ONLY (importe prisma + crypto). Ne JAMAIS importer côté client.
//
// Garanties :
//  - UNE manche OPEN à la fois (fenêtre de mise ROUND_MS). Résolution PARESSEUSE :
//    au 1er accès après `closesAt`, la manche est résolue et une nouvelle est ouverte.
//  - Numéro gagnant tiré par un RNG SEEDÉ SERVEUR. Le seed est généré aléatoirement à la
//    CRÉATION et gardé SECRET (jamais renvoyé tant que la manche est OPEN) → un client ne
//    peut pas pré-calculer le résultat depuis l'id public. Révélé seulement après résolution.
//  - Résolution ATOMIQUE (updateMany conditionnel sur status="OPEN") → pas de double-tirage
//    même si plusieurs joueurs déclenchent la résolution en même temps.
//  - Les MISES sont déclarées par le client (montants), enregistrées pour l'affichage social
//    et le net par joueur. La custody de l'énergie reste côté client (save) → réconciliation
//    idempotente par manche côté client (voir UI).

import { randomInt } from "crypto"
import prisma from "@/lib/prisma"
import { getPusher } from "@/lib/pusher"
import { Rng } from "../battle/rng"
import { colorOf, spinWheel } from "./wheel"
import { type Bet, isValidBet, meetsTableMinimum } from "./bets"
import { resolveSpin } from "./engine"
import { parseLuck, selectRiggedWinning } from "./luck"

/** Canal Pusher partagé de la roulette multijoueur (best-effort : no-op si Pusher off). */
export const ROULETTE_CHANNEL = "yellow_roulette"
export async function publishRoulette(type: string, data: Record<string, unknown>): Promise<void> {
    const pusher = getPusher()
    if (!pusher) return
    try {
        await pusher.trigger(`gamebook-${ROULETTE_CHANNEL}`, type, { type, ...data, timestamp: Date.now() })
    } catch {
        /* best-effort : le polling /state reste la source de vérité */
    }
}

/** Durée de la fenêtre de mise (ms). 10 min : large fenêtre pour miser tranquillement à plusieurs ; on
 *  n'attend pas ce délai en pratique → dès que TOUS les parieurs appuient sur « Lancer la balle » (ou le
 *  seul parieur en solo), la manche se résout immédiatement (cf. markReadyAndResolve). Le timer n'est que
 *  le garde-fou maximal si quelqu'un ne se déclare jamais prêt. */
export const ROUND_MS = 600_000
/** Nb de manches résolues renvoyées (révélation + réconciliation des gains côté client). */
export const RECENT_RESULTS = 6
/** Garde-fous anti-abus sur la charge utile de mises. */
const MAX_BETS_PER_PLAYER = 200
const MAX_TOTAL_STAKE = 1_000_000

export interface PublicRound {
    id: string
    status: string
    startedAt: number
    closesAt: number
    serverNow: number
    winningNumber: number | null
    winningColor: string | null
}
export interface PublicPlayerBets {
    userId: string
    nickname: string
    staked: number
    bets: Bet[]
    net: number | null
    ready: boolean
}
export interface RoundResult {
    roundId: string
    winningNumber: number
    winningColor: string
    closedAt: number
    players: Array<{ userId: string; nickname: string; staked: number; net: number }>
}
export interface RouletteStatePayload {
    round: PublicRound
    bets: PublicPlayerBets[]
    recentResults: RoundResult[]
}

/** Parse défensif d'une charge de mises sérialisée (jamais throw). */
export function parseBets(json: string): Bet[] {
    try {
        const arr = JSON.parse(json)
        if (!Array.isArray(arr)) return []
        return arr.filter((b) => b && typeof b === "object" && Array.isArray(b.numbers) && typeof b.chips === "number" && typeof b.type === "string")
    } catch {
        return []
    }
}

function publicRound(r: { id: string; status: string; startedAt: Date; closesAt: Date; winningNumber: number | null; winningColor: string | null }): PublicRound {
    const resolved = r.status === "RESOLVED"
    return {
        id: r.id,
        status: r.status,
        startedAt: r.startedAt.getTime(),
        closesAt: r.closesAt.getTime(),
        serverNow: Date.now(),
        // ne JAMAIS révéler le numéro avant la résolution (le seed reste secret de toute façon)
        winningNumber: resolved ? r.winningNumber : null,
        winningColor: resolved ? r.winningColor : null,
    }
}

async function createRound(): Promise<{ id: string; status: string; startedAt: Date; closesAt: Date; winningNumber: number | null; winningColor: string | null }> {
    const now = Date.now()
    // seed serveur SECRET (entropie crypto) : décide le numéro à la résolution, jamais exposé en OPEN.
    const seed = randomInt(1, 2_147_483_646)
    const created = await prisma.rouletteRound.create({
        data: { status: "OPEN", startedAt: new Date(now), closesAt: new Date(now + ROUND_MS), seed },
        select: { id: true, status: true, startedAt: true, closesAt: true, winningNumber: true, winningColor: true },
    })
    void publishRoulette("round:open", { roundId: created.id, closesAt: created.closesAt.getTime() })
    return created
}

/**
 * Résout UNE manche de façon atomique. Renvoie le résultat (numéro + nets par joueur),
 * ou null si la manche n'existe pas. Idempotent : si elle est déjà résolue (course perdue),
 * on relit simplement le résultat figé.
 */
async function resolveRound(roundId: string): Promise<RoundResult | null> {
    const round = await prisma.rouletteRound.findUnique({
        where: { id: roundId },
        select: { id: true, seed: true, status: true, winningNumber: true, winningColor: true, resolvedAt: true },
    })
    if (!round) return null

    let winning = round.winningNumber
    // Nets calculés EN MÉMOIRE quand c'est NOUS qui résolvons (course gagnée) : ils font autorité pour le
    // RoundResult renvoyé, même si la persistance du net échoue transitoirement (sinon le client lirait
    // net=null→0 et créditerait 0 gain de façon SILENCIEUSE et DÉFINITIVE — réconciliation idempotente).
    const computedNet = new Map<string, number>()
    if (round.status === "OPEN") {
        // tirage déterministe à partir du seed SECRET de la manche
        const rng = new Rng((round.seed ?? 1) >>> 0)
        // mises de la manche (pour détecter SOLO + jeton de chance, ET pour le règlement)
        const rows = await prisma.rouletteBet.findMany({ where: { roundId }, select: { id: true, betsJson: true, luck: true } })
        // RIG SECRET : UN SEUL parieur avec un jeton de chance → numéro plafonné (jamais de jackpot),
        // sinon tirage normal. Déterministe (mêmes mises + même seed) → pas de désync sur la course.
        let rigged: number | null = null
        if (rows.length === 1) { const luck = parseLuck((rows[0] as { luck?: string | null }).luck ?? null); if (luck) rigged = selectRiggedWinning(parseBets(rows[0].betsJson), luck, rng) }
        winning = rigged ?? spinWheel(() => rng.next())
        const color = colorOf(winning)
        // course : seul le 1er à passer OPEN→RESOLVED applique le tirage
        const claim = await prisma.rouletteRound.updateMany({
            where: { id: roundId, status: "OPEN" },
            data: { status: "RESOLVED", resolvedAt: new Date(), winningNumber: winning, winningColor: color },
        })
        if (claim.count === 1) {
            // on a gagné la course → on règle les mises (net par joueur)
            for (const row of rows) {
                const net = resolveSpin(winning, parseBets(row.betsJson)).net
                computedNet.set(row.id, net) // source de vérité du net renvoyé (indépendante de la persistance)
                await prisma.rouletteBet.update({ where: { id: row.id }, data: { net } })
                    .catch((e) => { console.warn("[roulette] échec persistance net", { roundId, betId: row.id, net, e }) })
            }
            void publishRoulette("round:closed", { roundId, winningNumber: winning, winningColor: color })
        } else {
            // course perdue : relire le numéro figé par le gagnant
            const fresh = await prisma.rouletteRound.findUnique({ where: { id: roundId }, select: { winningNumber: true } })
            winning = fresh?.winningNumber ?? winning
        }
    }
    if (winning == null) return null

    const betRows = await prisma.rouletteBet.findMany({
        where: { roundId },
        select: { id: true, userId: true, nickname: true, staked: true, net: true },
    })
    return {
        roundId,
        winningNumber: winning,
        winningColor: colorOf(winning),
        closedAt: (round.resolvedAt ?? new Date()).getTime(),
        // net renvoyé = net calculé en mémoire (course gagnée ici) en priorité, sinon net persisté (course
        // perdue / déjà résolue par un autre process) → jamais de gain « avalé » par un échec d'UPDATE.
        players: betRows.map((b) => ({ userId: b.userId, nickname: b.nickname, staked: b.staked, net: computedNet.get(b.id) ?? b.net ?? 0 })),
    }
}

/**
 * Normalise l'état : résout les manches expirées + les doublons OPEN éventuels (garde la plus
 * récente), crée une manche OPEN s'il n'en reste aucune. Renvoie la manche active.
 */
async function tick(): Promise<{ active: { id: string; status: string; startedAt: Date; closesAt: Date; winningNumber: number | null; winningColor: string | null } }> {
    const open = await prisma.rouletteRound.findMany({
        where: { status: "OPEN" },
        orderBy: { startedAt: "desc" },
        select: { id: true, status: true, startedAt: true, closesAt: true, winningNumber: true, winningColor: true },
    })
    if (open.length === 0) return { active: await createRound() }

    const newest = open[0]
    // doublons (course de création rare) : on referme tous sauf le plus récent
    for (const dup of open.slice(1)) await resolveRound(dup.id)

    if (newest.closesAt.getTime() <= Date.now()) {
        await resolveRound(newest.id)
        return { active: await createRound() }
    }
    return { active: newest }
}

/** État complet pour le client : manche active + mises de tous + manches récemment résolues. */
export async function getRouletteState(): Promise<RouletteStatePayload> {
    const { active } = await tick()

    const betRows = await prisma.rouletteBet.findMany({
        where: { roundId: active.id },
        select: { userId: true, nickname: true, staked: true, net: true, betsJson: true, ready: true },
        orderBy: { updatedAt: "asc" },
    })
    const bets: PublicPlayerBets[] = betRows.map((b) => ({
        userId: b.userId, nickname: b.nickname, staked: b.staked, net: b.net, bets: parseBets(b.betsJson), ready: b.ready,
    }))

    const resolved = await prisma.rouletteRound.findMany({
        where: { status: "RESOLVED", winningNumber: { not: null } },
        orderBy: { resolvedAt: "desc" },
        take: RECENT_RESULTS,
        select: {
            id: true, winningNumber: true, winningColor: true, resolvedAt: true,
            bets: { select: { userId: true, nickname: true, staked: true, net: true } },
        },
    })
    const recentResults: RoundResult[] = resolved.map((r) => ({
        roundId: r.id,
        winningNumber: r.winningNumber!,
        winningColor: r.winningColor ?? colorOf(r.winningNumber!),
        closedAt: (r.resolvedAt ?? new Date()).getTime(),
        players: r.bets.map((b) => ({ userId: b.userId, nickname: b.nickname, staked: b.staked, net: b.net ?? 0 })),
    }))

    return { round: publicRound(active), bets, recentResults }
}

export interface PlaceResult { ok: true; staked: number; roundId: string }

/**
 * Enregistre (REMPLACE) toutes les mises d'un joueur pour la manche active.
 * Valide la fenêtre (OPEN + non expirée) et chaque pari. Lève une Error avec un code lisible
 * en cas de refus (round_closed / invalid_bets / too_many / over_cap).
 */
export async function placeBets(userId: string, nickname: string, roundId: string, rawBets: unknown, rawLuck?: unknown): Promise<PlaceResult> {
    const round = await prisma.rouletteRound.findUnique({
        where: { id: roundId },
        select: { id: true, status: true, closesAt: true },
    })
    if (!round || round.status !== "OPEN" || round.closesAt.getTime() <= Date.now()) {
        throw new Error("round_closed")
    }
    // « RIEN NE VA PLUS » : dès qu'un parieur s'est déclaré PRÊT (séquence de lancement entamée), la mise
    // est fermée. Cela évite aussi qu'un parieur tardif se glisse entre le clic « Prêt » du SOLO et le
    // tirage, ce qui annulerait à tort son jeton de chance plafonné (le `ready` du solo est commité AVANT
    // cette fenêtre → tout placeBets postérieur voit anyReady et est refusé). Race résiduelle négligeable.
    const anyReady = await prisma.rouletteBet.findFirst({ where: { roundId, ready: true }, select: { id: true } })
    if (anyReady) throw new Error("round_closed")
    if (!Array.isArray(rawBets)) throw new Error("invalid_bets")
    if (rawBets.length > MAX_BETS_PER_PLAYER) throw new Error("too_many")

    const bets: Bet[] = []
    for (const b of rawBets as Array<Record<string, unknown>>) {
        const bet: Bet = {
            type: String(b.type ?? "") as Bet["type"],
            numbers: Array.isArray(b.numbers) ? (b.numbers as unknown[]).map((n) => Number(n)) : [],
            chips: Math.floor(Number(b.chips ?? 0)),
            zoneId: String(b.zoneId ?? ""),
        }
        if (!isValidBet(bet) || !bet.zoneId) throw new Error("invalid_bets")
        if (!meetsTableMinimum(bet)) throw new Error("below_min") // chances extérieures : 5 mini / case
        bets.push(bet)
    }
    const staked = bets.reduce((a, b) => a + b.chips, 0)
    if (staked > MAX_TOTAL_STAKE) throw new Error("over_cap")

    // Jeton de chance (potion barman) : validé + borné, stocké en JSON. Le RIG plafonné n'aura lieu QUE
    // si le joueur est SEUL à parier sur la manche (cf. resolveRound) — sinon la manche reste 100% juste.
    const luck = parseLuck(typeof rawLuck === "string" ? rawLuck : rawLuck ? JSON.stringify(rawLuck) : null)
    const luckJson = luck ? JSON.stringify(luck) : null

    await prisma.rouletteBet.upsert({
        where: { roundId_userId: { roundId, userId } },
        create: { roundId, userId, nickname, betsJson: JSON.stringify(bets), staked, luck: luckJson },
        // re-mise = je re-compose → je ne suis plus "prêt" (ready repart à false).
        update: { nickname, betsJson: JSON.stringify(bets), staked, luck: luckJson, ready: false },
    })
    return { ok: true, staked, roundId }
}

/**
 * "Lancer la balle" : le joueur se déclare PRÊT. Quand TOUS les parieurs de la manche sont prêts (cas
 * dégénéré : le seul parieur en solo), la manche se résout immédiatement, sans attendre `closesAt`.
 * Sécurité (revue adversariale) :
 *  - n'accepte JAMAIS de numéro/net depuis le client (seul `roundId` est fourni) ;
 *  - ne marque PRÊT que MA propre mise (where userId = ce user) — on ne peut pas « rendre prêt » un autre ;
 *  - ne résout QUE si la manche est OPEN ET que TOUS les parieurs (≥1) sont prêts → impossible de forcer
 *    le tirage d'une manche partagée tant que les autres n'ont pas appuyé (on attend, ou le timer 10 min) ;
 *  - la résolution passe par `resolveRound` (inchangé) : tirage 100 % seed serveur, rig SECRET re-décidé
 *    en interne (rows.length===1 → solo seulement) et plafonné, updateMany atomique OPEN→RESOLVED ;
 *  - ne crédite RIEN côté serveur : la custody d'énergie reste cliente + idempotente (markRouletteClaimed).
 */
export async function markReadyAndResolve(
    userId: string,
    roundId: string,
): Promise<{ status: "resolved" | "waiting" | "not_found" | "closed" | "no_bet"; result?: RoundResult; ready?: number; total?: number }> {
    const round = await prisma.rouletteRound.findUnique({ where: { id: roundId }, select: { status: true } })
    if (!round) return { status: "not_found" }
    if (round.status !== "OPEN") return { status: "closed" } // déjà résolue (timer / un autre vient de lancer)
    // Marque MA mise comme prête (doit exister). updateMany scoping userId → jamais la mise d'autrui.
    const mine = await prisma.rouletteBet.updateMany({ where: { roundId, userId }, data: { ready: true } })
    if (mine.count === 0) return { status: "no_bet" } // je dois avoir misé pour pouvoir lancer
    // Tous les parieurs sont-ils prêts ?
    const rows = await prisma.rouletteBet.findMany({ where: { roundId }, select: { ready: true } })
    const total = rows.length
    const readyCount = rows.filter((r) => r.ready).length
    if (total >= 1 && readyCount === total) {
        const result = await resolveRound(roundId) // re-décide rig (solo only) + tire via seed + ferme atomiquement
        return result ? { status: "resolved", result, ready: readyCount, total } : { status: "not_found" }
    }
    return { status: "waiting", ready: readyCount, total } // on attend les autres (ou le timer)
}
