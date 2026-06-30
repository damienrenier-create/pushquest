import { describe, it, expect } from "vitest"
import { handValue, isBlackjack, freshShoe, deal, hit, stand, double, canDouble, type Card } from "./blackjack"

// Sabot CONTRÔLÉ : on donne l'ordre de pioche voulu (deal/hit/stand piochent via pop = fin du tableau,
// donc on inverse). deck(p0,p1,d0,d1, …suite) → joueur [p0,p1], croupier [d0,d1], puis p0/p1… pour les tirages.
const deck = (...ranks: number[]): Card[] => ranks.map((r) => ({ rank: r, suit: 0 })).reverse()

describe("blackjack — valeur de main", () => {
    it("figures = 10, chiffres = leur valeur", () => {
        expect(handValue(deck(13, 10).reverse())).toBe(20) // R + 10
        expect(handValue([{ rank: 7, suit: 0 }, { rank: 5, suit: 0 }])).toBe(12)
    })
    it("As = 11, réduit à 1 si on dépasse 21", () => {
        expect(handValue([{ rank: 1, suit: 0 }, { rank: 10, suit: 0 }])).toBe(21)       // As+10 = 21
        expect(handValue([{ rank: 1, suit: 0 }, { rank: 1, suit: 0 }])).toBe(12)        // As+As = 12
        expect(handValue([{ rank: 1, suit: 0 }, { rank: 1, suit: 0 }, { rank: 9, suit: 0 }])).toBe(21) // 11+1+9
        expect(handValue([{ rank: 1, suit: 0 }, { rank: 10, suit: 0 }, { rank: 5, suit: 0 }])).toBe(16) // As compte 1
    })
    it("isBlackjack : 21 en EXACTEMENT 2 cartes", () => {
        expect(isBlackjack([{ rank: 1, suit: 0 }, { rank: 13, suit: 0 }])).toBe(true)
        expect(isBlackjack([{ rank: 7, suit: 0 }, { rank: 7, suit: 0 }, { rank: 7, suit: 0 }])).toBe(false) // 21 en 3 cartes ≠ blackjack
    })
})

describe("blackjack — sabot mélangé", () => {
    it("4 jeux = 208 cartes, déterministe pour un même rng", () => {
        let s = 1
        const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
        const a = freshShoe(rng, 4); expect(a.length).toBe(208)
        s = 1; const b = freshShoe(rng, 4)
        expect(b.map((c) => `${c.rank}-${c.suit}`)).toEqual(a.map((c) => `${c.rank}-${c.suit}`))
    })
})

describe("blackjack — règlement", () => {
    it("blackjack naturel payé 3:2 (réglé direct, sans tirage croupier)", () => {
        const s = deal(deck(1, 13, 5, 6), 10) // joueur As+R = 21 ; croupier 5+6 = 11
        expect(s.phase).toBe("done"); expect(s.outcome).toBe("blackjack")
        expect(s.payout).toBe(25); expect(s.net).toBe(15) // 10 + floor(10×1.5)=15
        expect(s.dealer.length).toBe(2) // le croupier n'a PAS tiré
    })
    it("tirer et sauter → perdu", () => {
        const s = hit(deal(deck(10, 6, 5, 6, 10), 10)) // 16 → tire 10 → 26
        expect(s.phase).toBe("done"); expect(s.outcome).toBe("lose"); expect(s.payout).toBe(0); expect(s.net).toBe(-10)
    })
    it("rester devant le croupier → gain 1:1", () => {
        const s = stand(deal(deck(10, 10, 10, 7), 10)) // joueur 20 ; croupier 17 (reste)
        expect(s.outcome).toBe("win"); expect(s.payout).toBe(20); expect(s.net).toBe(10)
    })
    it("égalité → remboursé (push)", () => {
        const s = stand(deal(deck(10, 8, 10, 8), 10)) // 18 vs 18
        expect(s.outcome).toBe("push"); expect(s.payout).toBe(10); expect(s.net).toBe(0)
    })
    it("croupier tire jusqu'à 17", () => {
        const s = stand(deal(deck(10, 9, 6, 5, 6), 10)) // joueur 19 ; croupier 11 → tire 6 → 17, reste
        expect(s.dealer.length).toBe(3); expect(handValue(s.dealer)).toBe(17); expect(s.outcome).toBe("win")
    })
    it("doubler : mise ×2, 1 carte, puis croupier joue", () => {
        const start = deal(deck(5, 6, 10, 7, 10), 10) // joueur 11 ; croupier 17
        expect(canDouble(start)).toBe(true)
        const s = double(start) // tire 10 → 21 ; croupier 17
        expect(s.bet).toBe(20); expect(s.doubled).toBe(true); expect(s.player.length).toBe(3)
        expect(s.outcome).toBe("win"); expect(s.payout).toBe(40); expect(s.net).toBe(20)
    })
    it("on ne peut pas doubler après avoir tiré", () => {
        const s = hit(deal(deck(5, 6, 10, 7, 2), 10)) // joueur 11 → tire 2 → 13 (3 cartes)
        expect(canDouble(s)).toBe(false)
        expect(double(s)).toBe(s) // no-op
    })
})
