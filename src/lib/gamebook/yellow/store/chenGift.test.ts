import { describe, it, expect } from "vitest"
import { grantRepsSoftCap, claimChenGift, chenGiftsRemaining, getPlayer } from "./playerStore"

// État par défaut du module au chargement : reps=0, repsCap=1000, chenGiftClaims=0, monde "live" (soft-cap actif).
// NB : les 2 blocs partagent l'état module (singleton) → l'ordre est volontaire (grantRepsSoftCap d'abord).

describe("grantRepsSoftCap — plafond SOUPLE (≤ softMult × repsCap, sans relever le cap dur)", () => {
    it("crédite au-dessus du cap dur mais borné à 2× cap ; le cap dur n'est pas relevé", () => {
        // cap dur = 1000 → plafond souple = 2000.
        expect(grantRepsSoftCap(1500)).toBe(1500)   // 0 → 1500 (dépasse le cap dur 1000, sous le souple 2000)
        expect(getPlayer().reps).toBe(1500)
        expect(getPlayer().repsCap).toBe(1000)       // ← le cap dur reste à 1000 (≠ grantBonusEnergyUncapped)
        expect(grantRepsSoftCap(1500)).toBe(500)     // 1500 → 2000 (borné au plafond souple)
        expect(getPlayer().reps).toBe(2000)
        expect(grantRepsSoftCap(999)).toBe(0)        // déjà au plafond souple → rien de plus
    })
})

describe("claimChenGift — cadeau Chen (mode fun), 2 max", () => {
    it("2 réclamations (tiers 1 puis 2) puis épuisé ; compteur borné à 2", () => {
        expect(chenGiftsRemaining()).toBe(2)
        expect(claimChenGift(300)?.tier).toBe(1)
        expect(getPlayer().chenGiftClaims).toBe(1)
        expect(chenGiftsRemaining()).toBe(1)
        expect(claimChenGift(300)?.tier).toBe(2)
        expect(getPlayer().chenGiftClaims).toBe(2)
        expect(chenGiftsRemaining()).toBe(0)
        expect(claimChenGift(300)).toBeNull()        // épuisé → aucun cadeau
        expect(getPlayer().chenGiftClaims).toBe(2)   // pas d'incrément au-delà de 2
    })
})
