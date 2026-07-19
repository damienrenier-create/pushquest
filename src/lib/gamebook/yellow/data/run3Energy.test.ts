import { describe, it, expect } from "vitest"
import { run3EnergyScore, run3EnergyMaxScore } from "./run3Score"
import { parseSave, emptySave } from "../storage/save"

describe("RUN 3 — score « Survivant » (énergie conservée)", () => {
    it("run3EnergyScore = Σ des snapshots, défensif", () => {
        expect(run3EnergyScore({ "arena:feu": 300, "arena:eau": 250, "league:y_ligue_1": 400 })).toBe(950)
        expect(run3EnergyScore({})).toBe(0)
        expect(run3EnergyScore(undefined)).toBe(0)
        expect(run3EnergyScore(null)).toBe(0)
        expect(run3EnergyScore({ a: -5, b: 10, c: NaN as unknown as number })).toBe(10) // ≥0, ignore NaN
    })

    it("run3EnergyMaxScore borne un score plausible (anti-triche POST)", () => {
        // 5 arènes + 5 membres de Ligue, chaque snapshot ≤ repsCap (1000) → un score réel reste sous le plafond.
        const realistic = { "arena:feu": 900, "arena:eau": 950, "arena:plante": 800, "arena:roche": 700, "arena:elec": 600, "league:y_ligue_1": 500, "league:y_ligue_maitre": 400 }
        expect(run3EnergyScore(realistic)).toBeLessThanOrEqual(run3EnergyMaxScore())
        expect(run3EnergyMaxScore()).toBeGreaterThan(0)
    })

    it("run3EnergyByArena : round-trip save (emptySave / parseSave défensif)", () => {
        expect(emptySave().run3EnergyByArena).toEqual({})
        const parsed = parseSave({ run3EnergyByArena: { "arena:feu": 300.7, "arena:eau": -5, bad: "x" } })
        expect(parsed.run3EnergyByArena).toEqual({ "arena:feu": 300, "arena:eau": 0 }) // floor, borné ≥0, ignore non-nombre
        // save sans le champ (ancienne save) → défaut {}
        expect(parseSave({}).run3EnergyByArena).toEqual({})
    })
})
