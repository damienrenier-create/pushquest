// src/lib/gamebook/yellow/poker/handEval.ts
//
// Nexus — Poker : évaluation de la MEILLEURE main de 5 cartes parmi 7 (2 privées + 5 communes).
// Pur & déterministe. Une main = { category, tiebreak[] } ; comparaison lexicographique sur tiebreak.

import type { Card } from "./cards"

export enum HandCategory {
    HIGH_CARD = 0,
    PAIR = 1,
    TWO_PAIR = 2,
    TRIPS = 3,        // brelan
    STRAIGHT = 4,     // suite
    FLUSH = 5,        // couleur
    FULL_HOUSE = 6,   // full
    QUADS = 7,        // carré
    STRAIGHT_FLUSH = 8,
}

export const CATEGORY_LABEL: Record<HandCategory, string> = {
    [HandCategory.HIGH_CARD]: "Carte haute",
    [HandCategory.PAIR]: "Paire",
    [HandCategory.TWO_PAIR]: "Double paire",
    [HandCategory.TRIPS]: "Brelan",
    [HandCategory.STRAIGHT]: "Suite",
    [HandCategory.FLUSH]: "Couleur",
    [HandCategory.FULL_HOUSE]: "Full",
    [HandCategory.QUADS]: "Carré",
    [HandCategory.STRAIGHT_FLUSH]: "Quinte flush",
}

export interface HandRank {
    category: HandCategory
    /** Rangs (2..14) par ordre de PRIORITÉ pour départager à catégorie égale (desc). */
    tiebreak: number[]
}

/** >0 si a est MEILLEURE, <0 si b, 0 si égalité stricte (split pot). */
export function compareHands(a: HandRank, b: HandRank): number {
    if (a.category !== b.category) return a.category - b.category
    const n = Math.max(a.tiebreak.length, b.tiebreak.length)
    for (let i = 0; i < n; i++) {
        const d = (a.tiebreak[i] ?? 0) - (b.tiebreak[i] ?? 0)
        if (d !== 0) return d
    }
    return 0
}

/** Évalue EXACTEMENT 5 cartes. */
export function eval5(cards: Card[]): HandRank {
    const ranksDesc = cards.map((c) => c.rank).sort((x, y) => y - x)
    const isFlush = cards.every((c) => c.suit === cards[0].suit)

    // Suite (5 rangs consécutifs distincts) — gère la « roue » A-2-3-4-5 (As bas → suite au 5).
    const uniq = [...new Set(ranksDesc)].sort((x, y) => y - x)
    let straightHigh = 0
    if (uniq.length === 5) {
        if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0]
        else if (uniq[0] === 14 && uniq[1] === 5 && uniq[2] === 4 && uniq[3] === 3 && uniq[4] === 2) straightHigh = 5
    }

    // Fréquences de rang → motif (ex. "41" carré+kicker, "32" full, "221" double paire…).
    const counts = new Map<number, number>()
    for (const r of ranksDesc) counts.set(r, (counts.get(r) ?? 0) + 1)
    const grouped = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]) // par (compte desc, rang desc)
    const pattern = grouped.map((g) => g[1]).join("")
    const byGroup = grouped.map((g) => g[0])

    if (isFlush && straightHigh) return { category: HandCategory.STRAIGHT_FLUSH, tiebreak: [straightHigh] }
    if (pattern === "41") return { category: HandCategory.QUADS, tiebreak: byGroup }        // [carré, kicker]
    if (pattern === "32") return { category: HandCategory.FULL_HOUSE, tiebreak: byGroup }   // [brelan, paire]
    if (isFlush) return { category: HandCategory.FLUSH, tiebreak: ranksDesc }               // 5 rangs desc
    if (straightHigh) return { category: HandCategory.STRAIGHT, tiebreak: [straightHigh] }
    if (pattern === "311") return { category: HandCategory.TRIPS, tiebreak: byGroup }       // [brelan, k1, k2]
    if (pattern === "221") return { category: HandCategory.TWO_PAIR, tiebreak: byGroup }    // [grosse paire, petite paire, kicker]
    if (pattern === "2111") return { category: HandCategory.PAIR, tiebreak: byGroup }       // [paire, k1, k2, k3]
    return { category: HandCategory.HIGH_CARD, tiebreak: ranksDesc }                        // 5 rangs desc
}

// Les 21 combinaisons de 5 indices parmi 7 (précalculées une fois).
const COMBOS_7_5: number[][] = (() => {
    const out: number[][] = []
    for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) for (let c = b + 1; c < 7; c++)
        for (let d = c + 1; d < 7; d++) for (let e = d + 1; e < 7; e++) out.push([a, b, c, d, e])
    return out
})()

/** Meilleure main de 5 cartes parmi N (≥5, typiquement 7 : 2 privées + 5 communes). */
export function evaluateBest(cards: Card[]): HandRank {
    if (cards.length === 5) return eval5(cards)
    if (cards.length === 7) {
        let best: HandRank | null = null
        for (const combo of COMBOS_7_5) {
            const h = eval5([cards[combo[0]], cards[combo[1]], cards[combo[2]], cards[combo[3]], cards[combo[4]]])
            if (!best || compareHands(h, best) > 0) best = h
        }
        return best!
    }
    // Cas générique (6 cartes, etc.) : toutes les combinaisons de 5.
    let best: HandRank | null = null
    const n = cards.length
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) {
            const h = eval5([cards[a], cards[b], cards[c], cards[d], cards[e]])
            if (!best || compareHands(h, best) > 0) best = h
        }
    return best!
}
