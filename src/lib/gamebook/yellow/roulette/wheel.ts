// src/lib/gamebook/yellow/roulette/wheel.ts
//
// Nexus — Roulette EUROPÉENNE : cylindre + couleurs + couvertures de cases.
// 37 numéros (0 vert + 1..36). 100% pur (aucune dépendance UI/DB). L'avantage maison
// de 2,70% n'est PAS « appliqué » : il ÉMERGE des maths (37 cases payées sur base 36).

export type RouletteColor = "green" | "red" | "black"

/** Ordre PHYSIQUE du cylindre européen (37 cases, sens horaire depuis le 0). */
export const WHEEL_ORDER: readonly number[] = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
    24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const

export const POCKET_COUNT = WHEEL_ORDER.length // 37

/** Numéros ROUGES (les autres de 1..36 sont noirs ; 0 = vert). */
export const RED_NUMBERS: ReadonlySet<number> = new Set([
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
])

/** Couleur d'un numéro. */
export function colorOf(n: number): RouletteColor {
    if (n === 0) return "green"
    return RED_NUMBERS.has(n) ? "red" : "black"
}

// ── Couvertures « chances extérieures » (dérivées, pas saisies par le joueur) ──
const RANGE_1_36 = Array.from({ length: 36 }, (_, i) => i + 1)

export const DOZENS: Readonly<Record<1 | 2 | 3, number[]>> = {
    1: RANGE_1_36.filter((n) => n <= 12),
    2: RANGE_1_36.filter((n) => n >= 13 && n <= 24),
    3: RANGE_1_36.filter((n) => n >= 25),
}
/** Colonnes : C1 = 1,4,7… (n%3===1) · C2 = 2,5,8… (n%3===2) · C3 = 3,6,9… (n%3===0). */
export const COLUMNS: Readonly<Record<1 | 2 | 3, number[]>> = {
    1: RANGE_1_36.filter((n) => n % 3 === 1),
    2: RANGE_1_36.filter((n) => n % 3 === 2),
    3: RANGE_1_36.filter((n) => n % 3 === 0),
}
export const REDS: number[] = RANGE_1_36.filter((n) => RED_NUMBERS.has(n))
export const BLACKS: number[] = RANGE_1_36.filter((n) => !RED_NUMBERS.has(n))
export const EVENS: number[] = RANGE_1_36.filter((n) => n % 2 === 0)
export const ODDS: number[] = RANGE_1_36.filter((n) => n % 2 === 1)
export const LOW: number[] = RANGE_1_36.filter((n) => n <= 18)   // Manque (1-18)
export const HIGH: number[] = RANGE_1_36.filter((n) => n >= 19)  // Passe (19-36)

/** Tire un numéro gagnant via un RNG INJECTÉ [0,1). Le serveur fournit le seed → inviolable. */
export function spinWheel(rng: () => number): number {
    return Math.floor(rng() * POCKET_COUNT) // 0..36, uniforme
}

/** Voisins physiques d'un numéro sur le cylindre (pour des paris « voisins » futurs / l'anim). */
export function neighborsOnWheel(n: number, span = 1): number[] {
    const i = WHEEL_ORDER.indexOf(n)
    if (i < 0) return []
    const out: number[] = []
    for (let k = -span; k <= span; k++) out.push(WHEEL_ORDER[(i + k + POCKET_COUNT) % POCKET_COUNT])
    return out
}
