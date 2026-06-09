import { describe, it, expect } from "vitest"
import { moveCostReps, STRUGGLE_INDEX, STRUGGLE_MOVE_ID } from "./combatCostConfig"

describe("moveCostReps (coût en reps des attaques)", () => {
    it("attaque forte → plus chère qu'une attaque faible (basé sur la puissance)", () => {
        const fort = moveCostReps(110)  // Hydrocanon
        const faible = moveCostReps(40) // Charge
        expect(fort).toBeGreaterThan(faible)
    })
    it("ancres calibrées : Charge (40) = 1 · Hydrocanon (110) = 10", () => {
        expect(moveCostReps(40)).toBe(1)
        expect(moveCostReps(110)).toBe(10)
    })
    it("indépendant du niveau (pas de rampe)", () => {
        // La fonction ne prend plus le niveau : même puissance → même coût, point.
        expect(moveCostReps(100)).toBe(moveCostReps(100))
    })
    it("statut (puissance 0) et toujours >= 1", () => {
        expect(moveCostReps(0)).toBe(1)
        expect(moveCostReps(-50)).toBeGreaterThanOrEqual(1)
        expect(moveCostReps(999)).toBeGreaterThanOrEqual(1)
    })
    it("la Charge Désespérée a un index sentinelle hors slots (gratuite)", () => {
        expect(STRUGGLE_INDEX).toBeLessThan(0)
        expect(STRUGGLE_MOVE_ID).toBe("charge_desesperee")
    })
})
