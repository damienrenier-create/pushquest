import { describe, it, expect } from "vitest"
import { replayCost } from "./replayCost"

describe("replayCost — coût JC croissant du rejeu (1er gratuit)", () => {
    it("suit le barème : 0 · 500 · 1200 · 2500 · 5000", () => {
        expect(replayCost(0)).toBe(0)
        expect(replayCost(1)).toBe(500)
        expect(replayCost(2)).toBe(1200)
        expect(replayCost(3)).toBe(2500)
        expect(replayCost(4)).toBe(5000)
    })
    it("au-delà du barème : +5000 par rejeu, strictement croissant", () => {
        expect(replayCost(5)).toBe(10000)
        expect(replayCost(6)).toBe(15000)
        for (let n = 1; n <= 20; n++) expect(replayCost(n)).toBeGreaterThan(replayCost(n - 1))
    })
    it("robuste aux entrées invalides", () => {
        expect(replayCost(-3)).toBe(0)
        expect(replayCost(1.9)).toBe(500) // floor
        expect(replayCost(NaN)).toBe(0)
    })
})
