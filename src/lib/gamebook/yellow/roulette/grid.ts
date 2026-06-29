// src/lib/gamebook/yellow/roulette/grid.ts
//
// Nexus — Roulette EU : MOTEUR DE GRILLE (entrées → zone). 100% pur.
//  - pointToZone : un clic/tap (x,y en unités-cases) « s'aimante » → centre=Plein,
//    près d'une arête=Cheval, près d'un coin=Carré ; bandes extérieures = point-dans-boîte.
//  - dpadMove : navigation « double résolution » au D-pad (saut vers l'ancre la plus proche
//    dans la direction pressée — gère naturellement centres, intersections et coins).

import type { Bet } from "./bets"
import type { BetZone } from "./tapis"

/** Limite droite de la grille des numéros (au-delà = colonnes). Bas de grille = y 3. */
const GRID_RIGHT = 13
const GRID_BOTTOM = 3
/** Biais pro-« Plein » : un cheval/carré ne gagne que si le clic est NETTEMENT près d'une arête/coin. */
const STRAIGHT_BIAS = 1.5

const isInside = (z: BetZone) =>
    z.type === "STRAIGHT" || z.type === "SPLIT" || z.type === "STREET" || z.type === "CORNER" || z.type === "SIXLINE"

const inBox = (px: number, py: number, z: BetZone) =>
    px >= z.x - z.w / 2 && px <= z.x + z.w / 2 && py >= z.y - z.h / 2 && py <= z.y + z.h / 2

const dist2 = (ax: number, ay: number, bx: number, by: number) => (ax - bx) ** 2 + (ay - by) ** 2

/**
 * Aimante un point (unités-cases) vers la zone visée.
 * Zone des numéros (x≤13, y≤3) → plus proche ancre intérieure (biais pro-Plein).
 * Au-delà (colonnes à droite / douzaines & chances simples en bas) → point-dans-boîte.
 */
export function pointToZone(px: number, py: number, zones: BetZone[]): BetZone | null {
    if (px > GRID_RIGHT || py > GRID_BOTTOM) {
        // Bandes extérieures : la première boîte qui contient le point.
        for (const z of zones) if (!isInside(z) && inBox(px, py, z)) return z
        return null
    }
    let best: BetZone | null = null
    let bestScore = Infinity
    for (const z of zones) {
        if (!isInside(z)) continue
        const score = dist2(px, py, z.x, z.y) * (z.type === "STRAIGHT" ? 1 : STRAIGHT_BIAS)
        if (score < bestScore) { bestScore = score; best = z }
    }
    return best
}

export type DpadDir = "up" | "down" | "left" | "right"

/**
 * Déplace le curseur vers la zone la plus proche DANS la direction pressée (cône ~ devant).
 * Gère la « double résolution » : l'ancre suivante peut être un centre, une arête ou un coin.
 */
export function dpadMove(currentId: string, dir: DpadDir, zones: BetZone[]): string {
    const cur = zones.find((z) => z.id === currentId)
    if (!cur) return zones[0]?.id ?? currentId
    const horiz = dir === "left" || dir === "right"
    const sign = dir === "right" || dir === "down" ? 1 : -1
    let best: BetZone | null = null
    let bestScore = Infinity
    for (const z of zones) {
        if (z.id === currentId) continue
        const dx = z.x - cur.x, dy = z.y - cur.y
        const along = (horiz ? dx : dy) * sign      // distance « vers l'avant »
        if (along <= 0.01) continue
        const perp = Math.abs(horiz ? dy : dx)      // écart latéral
        if (perp > along + 0.6) continue            // hors du cône → ignoré
        const score = along + perp * 1.5            // privilégie droit devant & proche
        if (score < bestScore) { bestScore = score; best = z }
    }
    return best?.id ?? currentId
}

/** Transforme une zone ciblée en pari concret (au dépôt d'un jeton). */
export function zoneToBet(zone: BetZone, chips: number): Bet {
    return { type: zone.type, numbers: zone.numbers, chips, zoneId: zone.id }
}
