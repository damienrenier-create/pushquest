import { describe, it, expect } from "vitest"
import { Rng } from "../battle/rng"
import { generateFrontierTeam } from "./engine"
import { startFrontierRun, applyFrontierWin } from "./run"
import { speciesAtLevel } from "../data/ace"
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

    it("bas streaks : tous stades (variété + formes faibles) ; hauts streaks : FINALES au niveau", () => {
        // Bas streak (≤9) : le pool inclut base/mid → variété maximale + formes faibles (approprié en début de série).
        const low = new Set<string>()
        for (let seed = 0; seed < 60; seed++) for (const o of generateFrontierTeam(new Rng(seed), { streak: 2, level: 100, size: 3 })) low.add(o.speciesId)
        expect(low.size).toBeGreaterThanOrEqual(12) // variété restaurée en début de série
        expect([...low].some((id) => !!getSpecies(id)?.evolution)).toBe(true) // des stades NON-finaux tirables (faibles = voulu)

        // Haut streak (>9) : uniquement des formes terminales au niveau (fini les « équipes nulles » quand ça compte).
        const high = new Set<string>()
        for (let seed = 0; seed < 60; seed++) for (const o of generateFrontierTeam(new Rng(seed), { streak: 20, level: 100, size: 3 })) high.add(o.speciesId)
        expect(high.size).toBeGreaterThanOrEqual(12)
        for (const id of high) expect(speciesAtLevel(id, 100)).toBe(id)
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
