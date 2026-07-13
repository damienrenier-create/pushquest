import { describe, it, expect } from "vitest"
import { Rng } from "../battle/rng"
import { generateFrontierTeam } from "./engine"
import { startFrontierRun, applyFrontierWin } from "./run"
import { getSpecies } from "../data/species"

// Zone de Combat — VARIÉTÉ : on évite de recroiser une espèce des ~2 dernières vagues.
describe("Frontier — anti-répétition", () => {
    it("generateFrontierTeam exclut les espèces `avoid` (quand le pool le permet)", () => {
        const first = generateFrontierTeam(new Rng(1), { streak: 20, level: 100, size: 3 }) // band [400,520] = pool large
        const avoid = first.map((o) => o.speciesId)
        for (let seed = 2; seed < 8; seed++) {
            const t = generateFrontierTeam(new Rng(seed), { streak: 20, level: 100, size: 3, avoid })
            expect(t.every((o) => !avoid.includes(o.speciesId)), `seed ${seed}`).toBe(true)
        }
    })

    it("le pool basse-bande inclut des formes NON-finales (base/mid) → variété enrichie", () => {
        const seen = new Set<string>()
        for (let seed = 0; seed < 60; seed++) {
            for (const o of generateFrontierTeam(new Rng(seed), { streak: 2, level: 100, size: 3 })) seen.add(o.speciesId)
        }
        // Une espèce AVEC une évolution = une forme de base/intermédiaire (pas une finale) → désormais tirable.
        expect([...seen].some((id) => !!getSpecies(id)?.evolution)).toBe(true)
    })

    it("la série mémorise les espèces des 2 dernières vagues (≤ 6)", () => {
        let s = startFrontierRun({ mode: "TOWER", levelRule: "L100", playerTopLevel: 100, seed: 5 })
        const w1 = s.opponent.map((o) => o.speciesId)
        expect(s.recentSpecies).toEqual(w1)
        s = applyFrontierWin(s, 40)
        const w2 = s.opponent.map((o) => o.speciesId)
        expect(s.recentSpecies).toEqual([...w2, ...w1].slice(0, 6))
        expect((s.recentSpecies ?? []).length).toBeLessThanOrEqual(6)
    })
})
