import { describe, it, expect } from "vitest"
import { moveCostReps, STRUGGLE_INDEX, STRUGGLE_MOVE_ID } from "./combatCostConfig"

describe("moveCostReps (coût = puissance, plafonné par bande de niveau)", () => {
    it("attaque forte → plus chère qu'une faible (à niveau égal)", () => {
        expect(moveCostReps(110, 40)).toBeGreaterThan(moveCostReps(40, 40))
    })
    it("plafond d'attaque par bande : Hydrocanon (110) = 5 / 8 / 10", () => {
        expect(moveCostReps(110, 10)).toBe(5)  // niv ≤15
        expect(moveCostReps(110, 25)).toBe(8)  // niv 16-30
        expect(moveCostReps(110, 45)).toBe(10) // niv 31+
    })
    it("puissance 90 (16-30) = 7 (floor, pas 8)", () => {
        expect(moveCostReps(90, 25)).toBe(7)
    })
    it("une attaque faible reste bon marché à tout niveau", () => {
        expect(moveCostReps(40, 10)).toBe(1)
        expect(moveCostReps(40, 45)).toBe(1)
    })
    it("statut (puissance 0) coûte 1 / 2 / 3 selon la bande", () => {
        expect(moveCostReps(0, 10)).toBe(1)
        expect(moveCostReps(0, 25)).toBe(2)
        expect(moveCostReps(0, 45)).toBe(3)
    })
    it("toujours >= 1, jamais au-dessus du plafond de bande", () => {
        expect(moveCostReps(-50, 10)).toBeGreaterThanOrEqual(1)
        expect(moveCostReps(999, 10)).toBe(5)   // plafonné même pour une puissance énorme
        expect(moveCostReps(999, 45)).toBe(10)
    })
    it("la Charge Désespérée a un index sentinelle hors slots (gratuite)", () => {
        expect(STRUGGLE_INDEX).toBeLessThan(0)
        expect(STRUGGLE_MOVE_ID).toBe("charge_desesperee")
    })
})
