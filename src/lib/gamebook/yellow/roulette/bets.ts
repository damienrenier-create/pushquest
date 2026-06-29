// src/lib/gamebook/yellow/roulette/bets.ts
//
// Nexus — Roulette EU : types de paris, PAYOUTS exacts, et constructeurs de paris.
// Un pari = { type, numbers (couverture), chips }. Le payout dépend du TYPE ; la couverture
// (numbers) est fournie par la grille (Phase 2) pour les paris « intérieurs », ou dérivée
// automatiquement pour les « chances extérieures ». 100% pur.

import { DOZENS, COLUMNS, REDS, BLACKS, EVENS, ODDS, LOW, HIGH } from "./wheel"

export type BetType =
    | "STRAIGHT"   // Plein (1 numéro)      → 35:1
    | "SPLIT"      // Cheval (2)            → 17:1
    | "STREET"     // Transversale (3)      → 11:1
    | "CORNER"     // Carré (4)             → 8:1
    | "SIXLINE"    // Sixain (6)            → 5:1
    | "COLUMN"     // Colonne (12)          → 2:1
    | "DOZEN"      // Douzaine (12)         → 2:1
    | "RED" | "BLACK" | "EVEN" | "ODD" | "LOW" | "HIGH" // Chances simples (18) → 1:1

/** Gain NET pour 1 chip misé (le « X » de X:1). Le retour total = chips × (PAYOUT + 1). */
export const PAYOUT: Readonly<Record<BetType, number>> = {
    STRAIGHT: 35, SPLIT: 17, STREET: 11, CORNER: 8, SIXLINE: 5,
    COLUMN: 2, DOZEN: 2,
    RED: 1, BLACK: 1, EVEN: 1, ODD: 1, LOW: 1, HIGH: 1,
}

/** Nb de numéros couverts attendu pour les paris INTÉRIEURS (validation de la grille). */
export const INSIDE_SIZE: Partial<Record<BetType, number>> = {
    STRAIGHT: 1, SPLIT: 2, STREET: 3, CORNER: 4, SIXLINE: 6,
}

export interface Bet {
    type: BetType
    /** Numéros couverts (0..36). Source de vérité pour « le pari touche-t-il ? ». */
    numbers: number[]
    /** Montant misé (en chips ; 1 chip = 1 unité de solde). */
    chips: number
    /** Identité STABLE de la case (pour empiler/retirer des jetons sur la même zone). */
    zoneId: string
}

/** Le pari touche-t-il le numéro sorti ? */
export function betWins(bet: Bet, winning: number): boolean {
    return bet.numbers.includes(winning)
}

/** Retour TOTAL d'un pari gagnant (mise + gain) ; 0 si perdu. */
export function betReturn(bet: Bet, winning: number): number {
    return betWins(bet, winning) ? bet.chips * (PAYOUT[bet.type] + 1) : 0
}

// ── Constructeurs (la grille en Phase 2 appellera ceux-ci ; pratiques pour tester) ──
const mk = (type: BetType, numbers: number[], chips: number, zoneId: string): Bet => ({ type, numbers, chips, zoneId })

// Paris intérieurs : la couverture vient de la grille (numéros adjacents sur le tapis).
export const straight = (n: number, chips: number) => mk("STRAIGHT", [n], chips, `straight:${n}`)
export const split = (ns: [number, number], chips: number) => mk("SPLIT", [...ns].sort((a, b) => a - b), chips, `split:${[...ns].sort((a, b) => a - b).join("-")}`)
export const street = (ns: number[], chips: number) => mk("STREET", ns, chips, `street:${[...ns].sort((a, b) => a - b).join("-")}`)
export const corner = (ns: number[], chips: number) => mk("CORNER", ns, chips, `corner:${[...ns].sort((a, b) => a - b).join("-")}`)
export const sixline = (ns: number[], chips: number) => mk("SIXLINE", ns, chips, `sixline:${[...ns].sort((a, b) => a - b).join("-")}`)

// Chances extérieures : couverture DÉRIVÉE (jamais saisie à la main → pas d'erreur).
export const dozen = (d: 1 | 2 | 3, chips: number) => mk("DOZEN", [...DOZENS[d]], chips, `dozen:${d}`)
export const column = (c: 1 | 2 | 3, chips: number) => mk("COLUMN", [...COLUMNS[c]], chips, `column:${c}`)
export const red = (chips: number) => mk("RED", [...REDS], chips, "red")
export const black = (chips: number) => mk("BLACK", [...BLACKS], chips, "black")
export const even = (chips: number) => mk("EVEN", [...EVENS], chips, "even")
export const odd = (chips: number) => mk("ODD", [...ODDS], chips, "odd")
export const low = (chips: number) => mk("LOW", [...LOW], chips, "low")
export const high = (chips: number) => mk("HIGH", [...HIGH], chips, "high")

/** Validation défensive d'un pari intérieur (la grille doit fournir la bonne taille). */
export function isValidBet(bet: Bet): boolean {
    if (bet.chips <= 0) return false
    if (bet.numbers.some((n) => n < 0 || n > 36 || !Number.isInteger(n))) return false
    const expected = INSIDE_SIZE[bet.type]
    if (expected !== undefined) return bet.numbers.length === expected
    return bet.numbers.length > 0 // extérieurs : couverture dérivée non vide
}
