import { describe, it, expect } from "vitest"
import { bourseMultiplier, shopPrice, BOURSE_HOURLY, type ShopPriceCtx } from "./shopPricing"

const base = (o: Partial<ShopPriceCtx> = {}): ShopPriceCtx => ({ hour: 8, sylvebarbeAwake: false, potionBuysToday: 0, jcEnergyBuysToday: 0, active: true, ...o })

describe("Bourse du Nexus — prix dynamiques", () => {
    it("bourseMultiplier : ×1 avant 8h, composé 8→20h, figé après 20h", () => {
        expect(bourseMultiplier(7)).toBe(1)
        expect(bourseMultiplier(8)).toBe(1)
        expect(bourseMultiplier(9)).toBeCloseTo(BOURSE_HOURLY, 5)
        expect(bourseMultiplier(20)).toBeCloseTo(Math.pow(BOURSE_HOURLY, 12), 5)
        expect(bourseMultiplier(23)).toBe(bourseMultiplier(20))
        expect(bourseMultiplier(3)).toBe(1)
    })

    it("shopPrice : bourse inactive (avant run 3) → prix de base immuable", () => {
        expect(shopPrice(10, "HEAL", base({ hour: 20, sylvebarbeAwake: true, potionBuysToday: 50, jcEnergyBuysToday: 5, active: false }))).toBe(10)
    })

    it("shopPrice : bourse s'applique à TOUS les objets (Ball 8h vs 20h)", () => {
        expect(shopPrice(200, "BALL", base({ hour: 8 }))).toBe(200)
        expect(shopPrice(200, "BALL", base({ hour: 20 }))).toBe(Math.round(200 * Math.pow(BOURSE_HOURLY, 12)))
    })

    it("shopPrice : Sylvebarbe ×1,5 sur les SOINS seulement", () => {
        expect(shopPrice(10, "HEAL", base({ sylvebarbeAwake: true }))).toBe(15)
        expect(shopPrice(200, "BALL", base({ sylvebarbeAwake: true }))).toBe(200)
    })

    it("shopPrice : inflation perso +1 %/achat sur les SOINS seulement", () => {
        expect(shopPrice(100, "HEAL", base({ potionBuysToday: 10 }))).toBe(Math.round(100 * Math.pow(1.01, 10)))
        expect(shopPrice(200, "BALL", base({ potionBuysToday: 10 }))).toBe(200)
    })

    it("shopPrice : inflation JC +10 %/recharge sur TOUS les objets (Ball incluse)", () => {
        expect(shopPrice(100, "BALL", base({ jcEnergyBuysToday: 0 }))).toBe(100)
        expect(shopPrice(100, "BALL", base({ jcEnergyBuysToday: 3 }))).toBe(Math.round(100 * Math.pow(1.10, 3))) // ~133
        expect(shopPrice(100, "HEAL", base({ jcEnergyBuysToday: 2 }))).toBe(Math.round(100 * Math.pow(1.10, 2)))
    })

    it("shopPrice : les effets se CUMULENT sur une potion (20h + Sylvebarbe + 20 achats soins + 3 recharges JC)", () => {
        const p = shopPrice(50, "HEAL", base({ hour: 20, sylvebarbeAwake: true, potionBuysToday: 20, jcEnergyBuysToday: 3 }))
        const expected = Math.round(50 * Math.pow(BOURSE_HOURLY, 12) * Math.pow(1.10, 3) * 1.5 * Math.pow(1.01, 20))
        expect(p).toBe(expected)
    })
})
