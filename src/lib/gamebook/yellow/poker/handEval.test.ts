import { describe, it, expect } from "vitest"
import { eval5, evaluateBest, compareHands, HandCategory } from "./handEval"
import type { Card, Suit } from "./cards"

const C = (rank: number, suit: Suit): Card => ({ rank, suit })
// Parse "Ah Kd 5c ..." → cartes. r: A/K/D/V ou nombre ; s: s h d c (♠♥♦♣ = 0 1 2 3).
const R: Record<string, number> = { A: 14, K: 13, D: 12, V: 11, T: 10 }
const S: Record<string, Suit> = { s: 0, h: 1, d: 2, c: 3 }
const hand = (str: string): Card[] => str.trim().split(/\s+/).map((tok) => {
    const suit = S[tok.slice(-1)]
    const rk = tok.slice(0, -1)
    return C(R[rk] ?? Number(rk), suit)
})

describe("eval5 — détection de catégorie", () => {
    const cases: Array<[string, string, HandCategory, number[]]> = [
        ["quinte flush", "Ts Vs Ds Ks As", HandCategory.STRAIGHT_FLUSH, [14]],
        ["quinte flush roue (A-5)", "As 2s 3s 4s 5s", HandCategory.STRAIGHT_FLUSH, [5]],
        ["carré", "7s 7h 7d 7c Ks", HandCategory.QUADS, [7, 13]],
        ["full", "Ds Dh Dd 2c 2s", HandCategory.FULL_HOUSE, [12, 2]],
        ["couleur", "2h 5h 9h Vh Kh", HandCategory.FLUSH, [13, 11, 9, 5, 2]],
        ["suite", "5s 6h 7d 8c 9s", HandCategory.STRAIGHT, [9]],
        ["suite roue (A-5)", "As 2h 3d 4c 5s", HandCategory.STRAIGHT, [5]],
        ["brelan", "8s 8h 8d Ks 2c", HandCategory.TRIPS, [8, 13, 2]],
        ["double paire", "Ks Kh 3d 3c 7s", HandCategory.TWO_PAIR, [13, 3, 7]],
        ["paire", "9s 9h As 7d 2c", HandCategory.PAIR, [9, 14, 7, 2]],
        ["carte haute", "As Kh 9d 5c 2s", HandCategory.HIGH_CARD, [14, 13, 9, 5, 2]],
    ]
    for (const [name, str, cat, tie] of cases) {
        it(name, () => {
            const h = eval5(hand(str))
            expect(h.category).toBe(cat)
            expect(h.tiebreak).toEqual(tie)
        })
    }
})

describe("compareHands — hiérarchie & départages", () => {
    it("full > couleur > suite > brelan", () => {
        const full = eval5(hand("Ds Dh Dd 2c 2s"))
        const flush = eval5(hand("2h 5h 9h Vh Kh"))
        const straight = eval5(hand("5s 6h 7d 8c 9s"))
        const trips = eval5(hand("8s 8h 8d Ks 2c"))
        expect(compareHands(full, flush)).toBeGreaterThan(0)
        expect(compareHands(flush, straight)).toBeGreaterThan(0)
        expect(compareHands(straight, trips)).toBeGreaterThan(0)
    })
    it("carré > full ; quinte flush > carré", () => {
        expect(compareHands(eval5(hand("7s 7h 7d 7c Ks")), eval5(hand("Ds Dh Dd 2c 2s")))).toBeGreaterThan(0)
        expect(compareHands(eval5(hand("Ts Vs Ds Ks As")), eval5(hand("7s 7h 7d 7c Ks")))).toBeGreaterThan(0)
    })
    it("la roue (5-high) est la plus PETITE suite", () => {
        expect(compareHands(eval5(hand("As 2h 3d 4c 5s")), eval5(hand("2s 3h 4d 5c 6s")))).toBeLessThan(0)
    })
    it("départage au kicker (même double paire)", () => {
        const kk33_A = eval5(hand("Ks Kh 3d 3c As"))
        const kk33_D = eval5(hand("Ks Kh 3d 3c Dc"))
        expect(compareHands(kk33_A, kk33_D)).toBeGreaterThan(0)
    })
    it("mains identiques = égalité (split)", () => {
        expect(compareHands(eval5(hand("As Kh 9d 5c 2s")), eval5(hand("Ah Ks 9c 5d 2h")))).toBe(0)
    })
})

describe("evaluateBest — meilleure main sur 7 cartes", () => {
    it("choisit la couleur cachée dans 7 cartes", () => {
        // 4 cœurs au board + 1 en main → couleur.
        const h = evaluateBest(hand("Ah Kd 2h 5h 9h Vs 3h"))
        expect(h.category).toBe(HandCategory.FLUSH)
        expect(h.tiebreak).toEqual([14, 9, 5, 3, 2]) // A 9 5 3 2 de cœur (les seuls 5 cœurs)
    })
    it("full depuis main + board", () => {
        // brelan de Dames + paire de 2 dispo.
        const h = evaluateBest(hand("Ds Dh Kd 2c 2s Dd 7c"))
        expect(h.category).toBe(HandCategory.FULL_HOUSE)
        expect(h.tiebreak).toEqual([12, 2])
    })
    it("la roue reconstituée sur 7 cartes", () => {
        const h = evaluateBest(hand("As 2h 3d 4c 5s Ks Dh"))
        expect(h.category).toBe(HandCategory.STRAIGHT)
        expect(h.tiebreak).toEqual([5])
    })
    it("prend le carré plutôt que le full quand les deux existent", () => {
        const h = evaluateBest(hand("9s 9h 9d 9c Ks Kh 2s"))
        expect(h.category).toBe(HandCategory.QUADS)
        expect(h.tiebreak).toEqual([9, 13]) // carré de 9, kicker Roi
    })
})
