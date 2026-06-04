import { describe, it, expect } from "vitest"
import { moveCostReps, STRUGGLE_INDEX, STRUGGLE_MOVE_ID } from "./combatCostConfig"

describe("moveCostReps (coût en reps des attaques)", () => {
    it("PP bas (attaque forte) → plus cher que PP haut", () => {
        const fort = moveCostReps(5, 20)   // ex. Hydrocanon
        const faible = moveCostReps(35, 20) // ex. Charge
        expect(fort).toBeGreaterThan(faible)
    })
    it("niveau élevé → plus cher (à PP égal)", () => {
        expect(moveCostReps(20, 50)).toBeGreaterThan(moveCostReps(20, 5))
    })
    it("toujours >= 1", () => {
        expect(moveCostReps(35, 1)).toBeGreaterThanOrEqual(1)
        expect(moveCostReps(999, 1)).toBeGreaterThanOrEqual(1)
    })
    it("formule : ceil((50/pp)*(1+lvl/25))", () => {
        // pp=10, lvl=25 → (5)*(2) = 10
        expect(moveCostReps(10, 25)).toBe(10)
    })
    it("la Charge Désespérée a un index sentinelle hors slots (gratuite)", () => {
        expect(STRUGGLE_INDEX).toBeLessThan(0)
        expect(STRUGGLE_MOVE_ID).toBe("charge_desesperee")
    })
})
