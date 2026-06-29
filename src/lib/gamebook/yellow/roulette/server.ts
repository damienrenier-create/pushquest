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
import { type Bet, isValidBet } from "./bets"
import { resolveSpin } from "./engine"

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

/** Durée de la fenêtre de mise (ms). 30 s : assez pour miser à plusieurs, assez court pour enchaîner. */
export const ROUND_MS = 30_000
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
    if (round.status === "OPEN") {
        // tirage déterministe à partir du seed SECRET de la manche
        const rng = new Rng((round.seed ?? 1) >>> 0)
        winning = spinWheel(() => rng.next())
        const color = colorOf(winning)
        // course : seul le 1er à passer OPEN→RESOLVED applique le tirage
        const claim = await prisma.rouletteRound.updateMany({
            where: { id: roundId, status: "OPEN" },
            data: { status: "RESOLVED", resolvedAt: new Date(), winningNumber: winning, winningColor: color },
        })
        if (claim.count === 1) {
            // on a gagné la course → on règle les mises (net par joueur)
            const rows = await prisma.rouletteBet.findMany({ where: { roundId }, select: { id: true, betsJson: true } })
            for (const row of rows) {
                const bets = parseBets(row.betsJson)
                const net = resolveSpin(winning, bets).net
                await prisma.rouletteBet.update({ where: { id: row.id }, data: { net } }).catch(() => {})
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
        select: { userId: true, nickname: true, staked: true, net: true },
    })
    return {
        roundId,
        winningNumber: winning,
        winningColor: colorOf(winning),
        closedAt: (round.resolvedAt ?? new Date()).getTime(),
        players: betRows.map((b) => ({ userId: b.userId, nickname: b.nickname, staked: b.staked, net: b.net ?? 0 })),
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
        select: { userId: true, nickname: true, staked: true, net: true, betsJson: true },
        orderBy: { updatedAt: "asc" },
    })
    const bets: PublicPlayerBets[] = betRows.map((b) => ({
        userId: b.userId, nickname: b.nickname, staked: b.staked, net: b.net, bets: parseBets(b.betsJson),
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
export async function placeBets(userId: string, nickname: string, roundId: string, rawBets: unknown): Promise<PlaceResult> {
    const round = await prisma.rouletteRound.findUnique({
        where: { id: roundId },
        select: { id: true, status: true, closesAt: true },
    })
    if (!round || round.status !== "OPEN" || round.closesAt.getTime() <= Date.now()) {
        throw new Error("round_closed")
    }
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
        bets.push(bet)
    }
    const staked = bets.reduce((a, b) => a + b.chips, 0)
    if (staked > MAX_TOTAL_STAKE) throw new Error("over_cap")

    await prisma.rouletteBet.upsert({
        where: { roundId_userId: { roundId, userId } },
        create: { roundId, userId, nickname, betsJson: JSON.stringify(bets), staked },
        update: { nickname, betsJson: JSON.stringify(bets), staked },
    })
    return { ok: true, staked, roundId }
}
