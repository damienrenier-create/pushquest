// src/lib/gamebook/yellow/roulette/engine.ts
//
// Nexus — Roulette EU : MOTEUR D'ÉTAT + RÉSOLUTION. 100% pur & déterministe (le numéro
// gagnant vient d'un RNG INJECTÉ / du serveur → inviolable). Découplé de l'UI et de la DB :
// la persistance (bankroll, historique) passe par un hook async injecté (Prisma/Neon en Phase 3).

import { type Bet, betWins, betReturn } from "./bets"
import { colorOf, spinWheel, type RouletteColor } from "./wheel"

/** Valeurs de jeton (le bouton Select fait défiler celles-ci). */
export const CHIP_VALUES = [1, 5, 10, 25, 100] as const
export type ChipValue = (typeof CHIP_VALUES)[number]

/** Profondeur d'historique conservée pour les stats. */
export const HISTORY_MAX = 200

export interface RouletteState {
    /** Solde misable (abstrait : alimenté par énergie + tickets en Phase 3). */
    balance: number
    /** Valeur du jeton courant. */
    chipValue: ChipValue
    /** Paris en cours, AGRÉGÉS par zoneId (un pari par case). */
    bets: Bet[]
    /** Journal des dépôts (pour l'undo granulaire : chaque appui A pousse une entrée). */
    placeLog: Array<{ zoneId: string; chips: number }>
    /** Mises verrouillées (pendant la résolution déclenchée par Start). */
    locked: boolean
    /** Numéros sortis (le plus récent en tête) → alimente le tracker de stats. */
    history: number[]
}

export function createRouletteState(balance: number, chipValue: ChipValue = 5): RouletteState {
    return { balance, chipValue, bets: [], placeLog: [], locked: false, history: [] }
}

/** Total actuellement misé sur le tapis (hors solde). */
export function totalStaked(s: RouletteState): number {
    return s.bets.reduce((a, b) => a + b.chips, 0)
}

/** Bouton Select : passe au jeton suivant (cycle). */
export function cycleChip(s: RouletteState): RouletteState {
    const i = CHIP_VALUES.indexOf(s.chipValue)
    return { ...s, chipValue: CHIP_VALUES[(i + 1) % CHIP_VALUES.length] }
}

/**
 * Bouton A — dépose `bet.chips` sur une case. Empile si la zone existe déjà (même zoneId).
 * No-op si verrouillé, mise ≤ 0, ou fonds insuffisants (l'UI grise déjà ce cas).
 */
export function placeBet(s: RouletteState, bet: Bet): RouletteState {
    if (s.locked || bet.chips <= 0 || bet.chips > s.balance) return s
    const bets = [...s.bets]
    const idx = bets.findIndex((b) => b.zoneId === bet.zoneId)
    if (idx >= 0) bets[idx] = { ...bets[idx], chips: bets[idx].chips + bet.chips }
    else bets.push(bet)
    return { ...s, balance: s.balance - bet.chips, bets, placeLog: [...s.placeLog, { zoneId: bet.zoneId, chips: bet.chips }] }
}

/** Bouton B (appui simple) — retire le DERNIER dépôt (undo granulaire), rembourse le solde. */
export function undoLast(s: RouletteState): RouletteState {
    if (s.locked || s.placeLog.length === 0) return s
    const last = s.placeLog[s.placeLog.length - 1]
    const bets = s.bets
        .map((b) => (b.zoneId === last.zoneId ? { ...b, chips: b.chips - last.chips } : b))
        .filter((b) => b.chips > 0)
    return { ...s, balance: s.balance + last.chips, bets, placeLog: s.placeLog.slice(0, -1) }
}

/** Bouton B (appui long) — VIDE une case ciblée, rembourse tout son contenu. */
export function clearZone(s: RouletteState, zoneId: string): RouletteState {
    if (s.locked) return s
    const bet = s.bets.find((b) => b.zoneId === zoneId)
    if (!bet) return s
    return {
        ...s,
        balance: s.balance + bet.chips,
        bets: s.bets.filter((b) => b.zoneId !== zoneId),
        placeLog: s.placeLog.filter((p) => p.zoneId !== zoneId),
    }
}

/** Retire TOUTES les mises (rembourse le solde). */
export function clearAll(s: RouletteState): RouletteState {
    if (s.locked) return s
    return { ...s, balance: s.balance + totalStaked(s), bets: [], placeLog: [] }
}

/** Bouton Start — verrouille les mises avant la résolution. */
export function lockBets(s: RouletteState): RouletteState {
    return s.locked ? s : { ...s, locked: true }
}

// ── Résolution (PURE) ──

export interface BetResult { bet: Bet; won: boolean; returned: number }
export interface SpinResult {
    winning: number
    color: RouletteColor
    totalStaked: number
    totalReturn: number
    net: number // totalReturn - totalStaked (négatif = perte nette de la donne)
}

/** Résout une donne SANS état : numéro sorti + paris → résultats détaillés. */
export function resolveSpin(winning: number, bets: Bet[]): { results: BetResult[]; staked: number; returned: number; net: number } {
    const results = bets.map((b) => ({ bet: b, won: betWins(b, winning), returned: betReturn(b, winning) }))
    const staked = bets.reduce((a, b) => a + b.chips, 0)
    const returned = results.reduce((a, r) => a + r.returned, 0)
    return { results, staked, returned, net: returned - staked }
}

/**
 * Applique une donne à l'état (PUR) : crédite les gains, archive le numéro, déverrouille.
 * Le solde a déjà été débité au dépôt → on ajoute juste le RETOUR (mise + gain des gagnants).
 */
export function settle(s: RouletteState, winning: number): { state: RouletteState; result: SpinResult; bets: BetResult[] } {
    const r = resolveSpin(winning, s.bets)
    const result: SpinResult = { winning, color: colorOf(winning), totalStaked: r.staked, totalReturn: r.returned, net: r.net }
    const state: RouletteState = {
        ...s,
        balance: s.balance + r.returned,
        bets: [],
        placeLog: [],
        locked: false,
        history: [winning, ...s.history].slice(0, HISTORY_MAX),
    }
    return { state, result, bets: r.results }
}

/**
 * Bouton START (asynchrone, prêt prod) : détermine le numéro gagnant (fourni par le SERVEUR via
 * `winning`, ou un `rng` seedé), applique la résolution, et PERSISTE via un hook injecté
 * (Prisma/Neon en Phase 3) — totalement découplé de l'UI. Lève si aucune source de hasard fournie
 * (on n'utilise JAMAIS Math.random par défaut : le hasard doit être autoritatif/serveur).
 */
export async function settleSpin(opts: {
    state: RouletteState
    winning?: number
    rng?: () => number
    persist?: (p: { winning: number; net: number; newBalance: number }) => Promise<void>
}): Promise<{ state: RouletteState; result: SpinResult; bets: BetResult[] }> {
    const winning = opts.winning ?? (opts.rng ? spinWheel(opts.rng) : null)
    if (winning === null) throw new Error("settleSpin : fournir `winning` (serveur) ou `rng` (seedé).")
    const out = settle(opts.state, winning)
    if (opts.persist) await opts.persist({ winning: out.result.winning, net: out.result.net, newBalance: out.state.balance })
    return out
}
