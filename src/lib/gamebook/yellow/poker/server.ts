// src/lib/gamebook/yellow/poker/server.ts
//
// Nexus — Poker : CROUPIER SERVEUR autoritaire (SERVER-ONLY : importe prisma + pusher).
// Une SEULE table partagée (id fixe) persistée en DB (PokerTable.stateJson). Chaque action est appliquée
// sous VERROU OPTIMISTE (colonne version) pour éviter les courses, puis un event Pusher `update` réveille
// les clients (qui re-fetchent leur vue REDACTÉE via /state → jamais les cartes des autres).
//
// Argent (v1, groupe de confiance) : buy-in / cash-out gérés CÔTÉ CLIENT en reps (débit à l'assise,
// crédit du `refund` au départ). Le serveur ne fait que suivre les tapis (chips). Durcissement
// serveur-autoritaire des reps = amélioration ultérieure.

import prisma from "@/lib/prisma"
import { getPusher } from "@/lib/pusher"
import { Rng, makeSeed } from "../battle/rng"
import { createTable, act, type PokerTable, type PokerAction } from "./engine"
import { publicView, joinTable, leaveTable, setSitOut, rebuy, maybeStartHand, type PublicTable } from "./room"
import { ensureBots, runBots } from "./bots"

export const POKER_TABLE_ID = "yellow_casino_holdem"
export const POKER_CHANNEL = "gamebook-yellow_poker"
export const POKER_BLINDS = { sb: 5, bb: 10 }
export const POKER_MAX_SEATS = 7
export const POKER_MIN_PLAYERS = 4 // on comble avec des IA jusqu'à ce total quand les potes manquent
export const POKER_MIN_BUYIN = 100
export const POKER_MAX_BUYIN = 5000

export async function publishPoker(type: string, data: Record<string, unknown> = {}): Promise<void> {
    const p = getPusher()
    if (!p) return
    try { await p.trigger(POKER_CHANNEL, type, { type, ...data, timestamp: Date.now() }) } catch { /* best-effort */ }
}

/** Charge la table (crée la ligne si absente). Gère la course de création. */
async function load(): Promise<{ table: PokerTable; version: number }> {
    let row = await prisma.pokerTable.findUnique({ where: { id: POKER_TABLE_ID } })
    if (!row) {
        const fresh = createTable([], POKER_BLINDS)
        try { await prisma.pokerTable.create({ data: { id: POKER_TABLE_ID, stateJson: JSON.stringify(fresh), version: 0 } }) } catch { /* déjà créée par une requête concurrente */ }
        row = await prisma.pokerTable.findUnique({ where: { id: POKER_TABLE_ID } })
    }
    if (!row) return { table: createTable([], POKER_BLINDS), version: 0 }
    return { table: JSON.parse(row.stateJson) as PokerTable, version: row.version }
}

/** Écrit uniquement si la version n'a pas bougé (verrou optimiste). */
async function trySave(table: PokerTable, expectedVersion: number): Promise<boolean> {
    const res = await prisma.pokerTable.updateMany({
        where: { id: POKER_TABLE_ID, version: expectedVersion },
        data: { stateJson: JSON.stringify(table), version: expectedVersion + 1 },
    })
    return res.count === 1
}

/** Seed de mélange à forte entropie SERVEUR (deck imprévisible). */
function shuffleSeed(version: number, handId: number): number {
    return makeSeed(version, handId, Date.now() >>> 0, (Math.random() * 2 ** 31) >>> 0)
}

/** Applique une mutation sous verrou optimiste (retry) : action → (re)peuplement IA → relance → jeu des bots → diffuse. */
async function mutate(fn: (t: PokerTable) => void, autoStart = false): Promise<PokerTable> {
    for (let attempt = 0; attempt < 6; attempt++) {
        const { table, version } = await load()
        fn(table)
        ensureBots(table, POKER_MIN_PLAYERS, POKER_MAX_SEATS)                        // comble/retire les IA (entre les mains)
        if (autoStart) maybeStartHand(table, new Rng(shuffleSeed(version, table.handId)))
        runBots(table, new Rng(shuffleSeed(version, table.handId) ^ 0x9e3779b9))     // les IA jouent leurs tours jusqu'au tour d'un humain
        if (await trySave(table, version)) { void publishPoker("update"); return table }
    }
    throw new Error("poker_version_conflict")
}

export async function pokerState(userId?: string): Promise<PublicTable> {
    const { table } = await load()
    return publicView(table, userId)
}

export async function pokerJoin(userId: string, name: string, buyin: number): Promise<PublicTable> {
    const bi = Math.max(POKER_MIN_BUYIN, Math.min(POKER_MAX_BUYIN, Math.floor(buyin || 0)))
    const t = await mutate((table) => {
        if (table.seats.filter((s) => !s.leaving).length >= POKER_MAX_SEATS) return // table pleine
        joinTable(table, { id: userId, name, buyin: bi })
    }, true) // démarre la 1re main dès qu'on est ≥2
    return publicView(t, userId)
}

export async function pokerAct(userId: string, action: PokerAction): Promise<PublicTable> {
    // Pas d'auto-relance ici : on laisse le résultat s'afficher ; la main suivante est déclenchée via pokerNextHand.
    const t = await mutate((table) => {
        const i = table.seats.findIndex((s) => s.id === userId)
        if (i >= 0 && table.toAct === i) act(table, i, action)
    })
    return publicView(t, userId)
}

export async function pokerSit(userId: string, out: boolean): Promise<PublicTable> {
    const t = await mutate((table) => setSitOut(table, userId, out))
    return publicView(t, userId)
}

export async function pokerRebuy(userId: string, amount: number): Promise<PublicTable> {
    const amt = Math.max(0, Math.min(POKER_MAX_BUYIN, Math.floor(amount || 0)))
    const t = await mutate((table) => { rebuy(table, userId, amt) })
    return publicView(t, userId)
}

/** Déclenche la main suivante (appelé par un client après affichage du résultat, ou par une minuterie). */
export async function pokerNextHand(): Promise<PublicTable> {
    const t = await mutate(() => { /* rien : maybeStartHand fait le travail */ }, true)
    return publicView(t)
}

/** Quitte la table : renvoie le tapis (`refund`) à recréditer en reps CÔTÉ CLIENT. */
export async function pokerLeave(userId: string): Promise<{ view: PublicTable; refund: number }> {
    let refund = 0
    const t = await mutate((table) => { refund = leaveTable(table, userId) })
    return { view: publicView(t, userId), refund }
}
