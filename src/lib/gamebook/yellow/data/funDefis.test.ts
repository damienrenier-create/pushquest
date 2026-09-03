import { describe, it, expect } from "vitest"
import { funArenaReward, funArenaRewardScaled, funLevelMultiplier, FUN_LVL_BONUS_FLOOR, FUN_LVL_BONUS_CEIL, FUN_LVL_BONUS_MAX } from "./funDefis"

describe("funDefis — bonus de niveau (Blitz d'arène)", () => {
    it("×1 jusqu'au plancher, ×2 au plafond, borné", () => {
        expect(funLevelMultiplier(1)).toBe(1)
        expect(funLevelMultiplier(FUN_LVL_BONUS_FLOOR)).toBe(1)      // niv 20 → ×1
        expect(funLevelMultiplier(FUN_LVL_BONUS_CEIL)).toBe(FUN_LVL_BONUS_MAX) // niv 50 → ×2
        expect(funLevelMultiplier(100)).toBe(FUN_LVL_BONUS_MAX)      // au-delà → plafonné ×2
        expect(funLevelMultiplier(0)).toBe(1)                        // sous le plancher → ×1
    })

    it("montée linéaire au milieu (niv 35 → ×1,5)", () => {
        expect(funLevelMultiplier(35)).toBeCloseTo(1.5, 5)
    })

    it("récompense arène scalée = base × multiplicateur (arrondi)", () => {
        // base par n° d'arène inchangée
        expect(funArenaReward(1)).toBe(100)
        expect(funArenaReward(5)).toBe(300)
        // à bas niveau, aucun changement
        expect(funArenaRewardScaled(1, 15)).toBe(100)
        expect(funArenaRewardScaled(5, 15)).toBe(300)
        // à niv 50, ×2
        expect(funArenaRewardScaled(1, 50)).toBe(200)
        expect(funArenaRewardScaled(5, 50)).toBe(600)
        // niv 35 → ×1,5
        expect(funArenaRewardScaled(5, 35)).toBe(450)
    })
})
