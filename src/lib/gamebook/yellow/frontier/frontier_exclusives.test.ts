import { describe, it, expect } from "vitest"
import { Rng } from "../battle/rng"
import { generateFrontierTeam, frontierEligible, FRONTIER_EXCLUSIVE_MIN_STREAK } from "./engine"
import { getSpecies } from "../data/species"

const isRun3 = (id: string) => !!getSpecies(id)?.runThreeOnly
const isRun2 = (id: string) => !!getSpecies(id)?.runTwoOnly

describe("Frontier — gate anti-spoiler des exclusivités run 2/3 (hautes sphères)", () => {
    it("frontierEligible : gate par run FAIT + streak, exclut les exclusive/gardiens", () => {
        expect(FRONTIER_EXCLUSIVE_MIN_STREAK).toBeGreaterThan(1)
        expect(frontierEligible("omnhippo", 30, false, false)).toBe(false) // run 3 pas fait → masqué
        expect(frontierEligible("omnhippo", 30, false, true)).toBe(true)   // run 3 fait + hautes sphères → OK
        expect(frontierEligible("omnhippo", 5, false, true)).toBe(false)   // run 3 fait mais streak trop bas
        expect(frontierEligible("gekosmic", 30, false, true)).toBe(false)  // exclusive (gardien) = jamais tiré
        expect(frontierEligible("cerfeuillu", 3, false, false)).toBe(true) // espèce normale = toujours éligible
    })

    it("generateFrontierTeam N'INCLUT JAMAIS de runTwoOnly/runThreeOnly sans le run fait (anti-spoiler)", () => {
        for (let s = 0; s < 60; s++) {
            const team = generateFrontierTeam(new Rng(s * 7 + 1), { streak: 30, level: 60 }) // pas de allowRun2/3
            for (const o of team) expect(isRun3(o.speciesId) || isRun2(o.speciesId), o.speciesId).toBe(false)
        }
    })

    it("generateFrontierTeam PEUT inclure des runThreeOnly avec allowRun3 en hautes sphères", () => {
        let seen = false
        for (let s = 0; s < 500 && !seen; s++) {
            const team = generateFrontierTeam(new Rng(s * 13 + 3), { streak: 20, level: 60, allowRun3: true })
            if (team.some((o) => isRun3(o.speciesId))) seen = true
        }
        expect(seen).toBe(true)
    })
})
