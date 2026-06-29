// src/lib/gamebook/yellow/roulette/tapis.ts
//
// Nexus — Roulette EU : DICTIONNAIRE DU TAPIS (layout d'une vraie table européenne).
// Génère TOUTES les zones jouables (~157) avec leur COUVERTURE (numéros) ET leur position
// en « unités-cases » (le rendu Phase 2b les multipliera par une taille de case). 100% pur.
//
// Repère (unités-cases) : le 0 occupe x∈[0,1], y∈[0,3]. Les numéros forment 3 rangées × 12
// colonnes à droite du 0 : la case (r,c) est en x=1+c, y=r (r:0 haut→2 bas, c:0..11).
//   number(r,c) = 3*(c+1) - r  → rangée haut {3,6,…,36}, milieu {2,5,…,35}, bas {1,4,…,34}.

import {
    type Bet, type BetType,
    straight, split, street, corner, sixline, column, dozen, red, black, even, odd, low, high,
} from "./bets"

export interface BetZone {
    id: string
    type: BetType
    numbers: number[]
    /** Ancre (centre de la zone) en unités-cases → cible du curseur D-pad. */
    x: number
    y: number
    /** Boîte de rendu (unités-cases). Pour les paris « intérieurs » = petite pastille à l'ancre. */
    w: number
    h: number
}

export const TABLE_COLS = 12
export const TABLE_ROWS = 3

/** Numéro de la case (rangée r 0..2, colonne c 0..11). */
export function numberAt(r: number, c: number): number {
    return 3 * (c + 1) - r
}

/** Bet template (chips=0) → BetZone positionnée. */
function zone(t: Bet, x: number, y: number, w = 0.5, h = 0.5): BetZone {
    return { id: t.zoneId, type: t.type, numbers: t.numbers, x, y, w, h }
}

/** Construit l'intégralité des zones du tapis. */
export function buildTapis(): BetZone[] {
    const z: BetZone[] = []

    // ── PLEINS ──
    z.push(zone(straight(0, 0), 0.5, 1.5, 1, 3)) // le 0 (pleine hauteur)
    for (let r = 0; r < TABLE_ROWS; r++)
        for (let c = 0; c < TABLE_COLS; c++)
            z.push(zone(straight(numberAt(r, c), 0), 1.5 + c, 0.5 + r, 1, 1))

    // ── CHEVAUX (splits) ──
    // horizontaux : (r,c) | (r,c+1) → ancre sur l'arête droite de (r,c)
    for (let r = 0; r < TABLE_ROWS; r++)
        for (let c = 0; c < TABLE_COLS - 1; c++)
            z.push(zone(split([numberAt(r, c), numberAt(r, c + 1)], 0), 2 + c, 0.5 + r))
    // verticaux : (r,c) | (r+1,c) → ancre sur l'arête basse de (r,c)
    for (let r = 0; r < TABLE_ROWS - 1; r++)
        for (let c = 0; c < TABLE_COLS; c++)
            z.push(zone(split([numberAt(r, c), numberAt(r + 1, c)], 0), 1.5 + c, 1 + r))
    // chevaux avec le 0 : 0-3 (haut), 0-2 (milieu), 0-1 (bas) → arête droite du 0
    z.push(zone(split([0, numberAt(0, 0)], 0), 1, 0.5)) // 0-3
    z.push(zone(split([0, numberAt(1, 0)], 0), 1, 1.5)) // 0-2
    z.push(zone(split([0, numberAt(2, 0)], 0), 1, 2.5)) // 0-1

    // ── TRANSVERSALES (streets, 3) ── une par colonne, ancre au bas de la colonne
    for (let c = 0; c < TABLE_COLS; c++)
        z.push(zone(street([numberAt(0, c), numberAt(1, c), numberAt(2, c)], 0), 1.5 + c, 3))
    // trios avec le 0 : 0-1-2 et 0-2-3
    z.push(zone(street([0, 1, 2], 0), 1, 2.6))
    z.push(zone(street([0, 2, 3], 0), 1, 0.4))

    // ── CARRÉS (corners, 4) ── intersection (r,c)/(r,c+1)/(r+1,c)/(r+1,c+1)
    for (let r = 0; r < TABLE_ROWS - 1; r++)
        for (let c = 0; c < TABLE_COLS - 1; c++)
            z.push(zone(corner([numberAt(r, c), numberAt(r, c + 1), numberAt(r + 1, c), numberAt(r + 1, c + 1)], 0), 2 + c, 1 + r))
    // « premier carré » 0-1-2-3, coin haut-gauche de la grille
    z.push(zone(corner([0, 1, 2, 3], 0), 1, 0))

    // ── SIXAINS (six line, 6) ── à la jonction basse de deux colonnes adjacentes
    for (let c = 0; c < TABLE_COLS - 1; c++) {
        const six = [numberAt(0, c), numberAt(1, c), numberAt(2, c), numberAt(0, c + 1), numberAt(1, c + 1), numberAt(2, c + 1)]
        z.push(zone(sixline(six, 0), 2 + c, 3))
    }

    // ── COLONNES (2:1) ── à droite de chaque rangée. rangée 0(haut)=C3, 1=C2, 2(bas)=C1
    z.push(zone(column(3, 0), 13.5, 0.5, 1, 1))
    z.push(zone(column(2, 0), 13.5, 1.5, 1, 1))
    z.push(zone(column(1, 0), 13.5, 2.5, 1, 1))

    // ── DOUZAINES (2:1) ── bande sous la grille (4 colonnes chacune)
    z.push(zone(dozen(1, 0), 3, 3.5, 4, 1))
    z.push(zone(dozen(2, 0), 7, 3.5, 4, 1))
    z.push(zone(dozen(3, 0), 11, 3.5, 4, 1))

    // ── CHANCES SIMPLES (1:1) ── bande du bas, 6 segments de 2 colonnes
    z.push(zone(low(0), 2, 4.5, 2, 1))    // Manque (1-18)
    z.push(zone(even(0), 4, 4.5, 2, 1))   // Pair
    z.push(zone(red(0), 6, 4.5, 2, 1))    // Rouge
    z.push(zone(black(0), 8, 4.5, 2, 1))  // Noir
    z.push(zone(odd(0), 10, 4.5, 2, 1))   // Impair
    z.push(zone(high(0), 12, 4.5, 2, 1))  // Passe (19-36)

    return z
}

/** Index par id (pratique pour la grille / le rendu). */
export function indexById(zones: BetZone[]): Record<string, BetZone> {
    const m: Record<string, BetZone> = {}
    for (const z of zones) m[z.id] = z
    return m
}
