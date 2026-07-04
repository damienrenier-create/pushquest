// src/lib/gamebook/yellow/poker/cards.ts
//
// Nexus — Poker (Texas Hold'em) : cartes + paquet + mélange déterministe.
// Rang 2..14 (11=Valet, 12=Dame, 13=Roi, 14=As). Couleur 0..3 (♠♥♦♣). RNG injecté → rejouable/testable.

import { Rng } from "../battle/rng"

export type Suit = 0 | 1 | 2 | 3
export interface Card {
    /** 2..14 (14 = As, 13 = Roi, 12 = Dame, 11 = Valet). */
    rank: number
    suit: Suit
}

export const SUIT_SYMBOL = ["♠", "♥", "♦", "♣"] as const
const RANK_LABEL: Record<number, string> = { 11: "V", 12: "D", 13: "R", 14: "A" }

export function rankLabel(rank: number): string {
    return RANK_LABEL[rank] ?? String(rank)
}
export function cardLabel(c: Card): string {
    return rankLabel(c.rank) + SUIT_SYMBOL[c.suit]
}

/** Paquet neuf de 52 cartes (ordre canonique). */
export function makeDeck(): Card[] {
    const deck: Card[] = []
    for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) deck.push({ rank: r, suit: s as Suit })
    return deck
}

/** Mélange Fisher-Yates DÉTERMINISTE (RNG injecté). Retourne un NOUVEAU tableau (n'altère pas l'entrée). */
export function shuffle(deck: readonly Card[], rng: Rng): Card[] {
    const a = [...deck]
    for (let i = a.length - 1; i > 0; i--) {
        const j = rng.int(0, i)
        const tmp = a[i]; a[i] = a[j]; a[j] = tmp
    }
    return a
}

/** Paquet neuf déjà mélangé (helper). */
export function shuffledDeck(rng: Rng): Card[] {
    return shuffle(makeDeck(), rng)
}
