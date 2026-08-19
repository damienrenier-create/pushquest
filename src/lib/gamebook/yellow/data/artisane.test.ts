import { describe, it, expect } from "vitest"
import { craftCost, craftPrecision, craftLifetimeCap, craftItemName, clampPct, CRAFT_ITEM_NAMES } from "./artisane"

describe("Artisane — logique de craft", () => {
    it("coût = niveau × demande% (50 × 20 = 1000)", () => {
        expect(craftCost(50, 20)).toBe(1000)
        expect(craftCost(30, 10)).toBe(300)
        expect(craftCost(100, 40)).toBe(4000)
    })
    it("demande bornée 10–40 %", () => {
        expect(clampPct(5)).toBe(10)
        expect(clampPct(50)).toBe(40)
        expect(clampPct(25)).toBe(25)
    })
    it("précision : PV & shiny = 100 %, sinon ∝ potentiel génétique (ΣIV/75), plancher 20", () => {
        expect(craftPrecision("hp", 0, false)).toBe(100)   // PV toujours 100
        expect(craftPrecision("atk", 75, false)).toBe(100) // IV parfaits = 100
        expect(craftPrecision("atk", 0, false)).toBe(20)   // plancher 20
        expect(craftPrecision("atk", 37, false)).toBe(49)  // mi-IV ≈ 50 %
        expect(craftPrecision("def", 10, true)).toBe(100)  // shiny = 100
    })
    it("plafond à vie : 6 avant Ligue Fusion bronze, 12 après", () => {
        expect(craftLifetimeCap(false)).toBe(6)
        expect(craftLifetimeCap(true)).toBe(12)
    })
    it("nom d'objet déterministe dans le pool de la stat", () => {
        const n = craftItemName("atk", 3)
        expect(CRAFT_ITEM_NAMES.atk).toContain(n)
        expect(craftItemName("atk", 3)).toBe(n) // déterministe (même seed → même nom)
    })
})
