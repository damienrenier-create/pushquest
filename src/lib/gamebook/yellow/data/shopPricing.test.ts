import { describe, it, expect } from "vitest"
import { bourseMultiplier, shopPrice, BOURSE_HOURLY } from "./shopPricing"

describe("Bourse du Nexus — prix dynamiques", () => {
    it("bourseMultiplier : ×1 avant 8h, composé 8→20h, figé après 20h", () => {
        expect(bourseMultiplier(7)).toBe(1)                    // nuit → base
        expect(bourseMultiplier(8)).toBe(1)                    // ouverture → base
        expect(bourseMultiplier(9)).toBeCloseTo(BOURSE_HOURLY, 5) // +1h = ×1,10
        expect(bourseMultiplier(20)).toBeCloseTo(Math.pow(BOURSE_HOURLY, 12), 5) // pic ~×3,14
        expect(bourseMultiplier(23)).toBe(bourseMultiplier(20)) // après 20h : figé au pic (jusqu'au reset de minuit)
        expect(bourseMultiplier(3)).toBe(1)                    // après minuit : reset → base
    })

    it("shopPrice : bourse inactive (avant run 3) → prix de base immuable", () => {
        expect(shopPrice(10, "HEAL", { hour: 20, sylvebarbeAwake: true, potionBuysToday: 50, active: false })).toBe(10)
    })

    it("shopPrice : bourse s'applique à TOUS les objets (ex. Ball à 8h vs 20h)", () => {
        const ctx = { sylvebarbeAwake: false, potionBuysToday: 0, active: true }
        expect(shopPrice(200, "BALL", { ...ctx, hour: 8 })).toBe(200)          // base
        expect(shopPrice(200, "BALL", { ...ctx, hour: 20 })).toBe(Math.round(200 * Math.pow(BOURSE_HOURLY, 12))) // pic
    })

    it("shopPrice : Sylvebarbe ×1,5 sur les SOINS seulement (pas les Balls)", () => {
        const at8 = { hour: 8, potionBuysToday: 0, active: true }
        expect(shopPrice(10, "HEAL", { ...at8, sylvebarbeAwake: true })).toBe(15) // 10 ×1,5
        expect(shopPrice(10, "HEAL", { ...at8, sylvebarbeAwake: false })).toBe(10)
        expect(shopPrice(200, "BALL", { ...at8, sylvebarbeAwake: true })).toBe(200) // Balls PAS affectées par Sylvebarbe
    })

    it("shopPrice : inflation perso +1 %/achat sur les SOINS (cumulée), reset via potionBuysToday=0", () => {
        const base = { hour: 8, sylvebarbeAwake: false, active: true }
        expect(shopPrice(100, "HEAL", { ...base, potionBuysToday: 0 })).toBe(100)
        expect(shopPrice(100, "HEAL", { ...base, potionBuysToday: 10 })).toBe(Math.round(100 * Math.pow(1.01, 10))) // ~110
        expect(shopPrice(200, "BALL", { ...base, potionBuysToday: 10 })).toBe(200) // Balls PAS affectées par l'inflation perso
    })

    it("shopPrice : les 3 effets se CUMULENT sur une potion (20h + Sylvebarbe + 20 achats)", () => {
        const p = shopPrice(50, "HEAL", { hour: 20, sylvebarbeAwake: true, potionBuysToday: 20, active: true })
        const expected = Math.round(50 * Math.pow(BOURSE_HOURLY, 12) * 1.5 * Math.pow(1.01, 20))
        expect(p).toBe(expected)
    })
})
