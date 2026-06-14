import { describe, it, expect } from "vitest"
import { createMonInstance } from "./factory"
import { fullStats } from "./stats"
import { getSpecies } from "../data/species"

describe("Shiny (chromatique)", () => {
    it("force des IV parfaits (15) + pose le flag shiny", () => {
        const s = createMonInstance("brook", 50, { shiny: true, ivsByStat: { atk: 0 } })
        expect(s.shiny).toBe(true)
        for (const k of ["hp", "atk", "def", "spe", "spc"] as const) expect(s.ivs[k]).toBe(15) // 15 même si ivsByStat demandait 0
    })

    it("« un peu plus que parfait » : +10% (floor) sur CHAQUE stat finale", () => {
        const sp = getSpecies("brook")!
        const normal = createMonInstance("brook", 50)        // IV 15 par défaut, non shiny
        const shiny = createMonInstance("brook", 50, { shiny: true })
        const ns = fullStats(normal, sp)
        const ss = fullStats(shiny, sp)
        for (const k of ["hp", "atk", "def", "spe", "spc"] as const) {
            expect(ss[k]).toBe(Math.floor(ns[k] * 1.1))
            expect(ss[k]).toBeGreaterThan(ns[k])
        }
    })

    it("les PV courants à la création reflètent le HP shiny boosté", () => {
        const sp = getSpecies("brook")!
        const shiny = createMonInstance("brook", 50, { shiny: true })
        expect(shiny.currentHp).toBe(fullStats(shiny, sp).hp)
    })

    it("un Daemon non-shiny n'a aucun bonus", () => {
        const m = createMonInstance("brook", 50)
        expect(m.shiny).toBeUndefined()
    })
})
