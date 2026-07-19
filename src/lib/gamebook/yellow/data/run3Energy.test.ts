import { describe, it, expect } from "vitest"
import { run3EnergyScore } from "./run3Score"
import { parseSave, emptySave } from "../storage/save"

describe("RUN 3 — score « Survivant » (énergie conservée)", () => {
    it("run3EnergyScore = Σ des snapshots, défensif", () => {
        expect(run3EnergyScore({ "arena:feu": 300, "arena:eau": 250, "league:y_ligue_1": 400 })).toBe(950)
        expect(run3EnergyScore({})).toBe(0)
        expect(run3EnergyScore(undefined)).toBe(0)
        expect(run3EnergyScore(null)).toBe(0)
        expect(run3EnergyScore({ a: -5, b: 10, c: NaN as unknown as number })).toBe(10) // ≥0, ignore NaN
    })

    it("run3EnergyByArena : round-trip save (emptySave / parseSave défensif)", () => {
        expect(emptySave().run3EnergyByArena).toEqual({})
        const parsed = parseSave({ run3EnergyByArena: { "arena:feu": 300.7, "arena:eau": -5, bad: "x" } })
        expect(parsed.run3EnergyByArena).toEqual({ "arena:feu": 300, "arena:eau": 0 }) // floor, borné ≥0, ignore non-nombre
        // save sans le champ (ancienne save) → défaut {}
        expect(parseSave({}).run3EnergyByArena).toEqual({})
    })
})
