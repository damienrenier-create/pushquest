import { describe, it, expect } from "vitest"
import { Rng } from "../battle/rng"
import { generateFrontierTeam, frontierEligible, FRONTIER_EXCLUSIVE_MIN_STREAK, FRONTIER_UNLOCKS } from "./engine"
import { getSpecies } from "../data/species"

const isRun3 = (id: string) => !!getSpecies(id)?.runThreeOnly

describe("Frontier — exclusivités run 2/3 visibles par TOUS (teaser « ce que tu as raté »), bornées par BST/streak", () => {
    it("frontierEligible : runX (non-exclusive) partout ; gardiens/boss (FRONTIER_UNLOCKS) en hautes sphères ; exclusive sinon", () => {
        expect(FRONTIER_EXCLUSIVE_MIN_STREAK).toBeGreaterThan(1)
        // runTwoOnly/runThreeOnly NON-exclusive (hippos/Karmaki) : visibles à TOUT streak (plus d'anti-spoiler)
        expect(frontierEligible("omnhippo", 5)).toBe(true)
        expect(frontierEligible("karmaki", 30)).toBe(true)
        // gardiens/boss `exclusive` débloqués (Gékraise/Gékosmic/Merorem) : hautes sphères seulement
        for (const id of ["gekraise", "gekosmic", "merorem"]) {
            expect(FRONTIER_UNLOCKS.has(id), id).toBe(true)
            expect(frontierEligible(id, 30), id).toBe(true) // hautes sphères → OK
            expect(frontierEligible(id, 5), id).toBe(false)  // streak trop bas
        }
        // Ukognos (légendaire) = Cerveau thématique only, jamais adversaire normal
        expect(frontierEligible("ukognos", 30)).toBe(false)
        // espèce normale + Morrow (aucun flag) : toujours éligibles
        expect(frontierEligible("cerfeuillu", 3)).toBe(true)
        expect(frontierEligible("morrow", 3)).toBe(true)
    })

    it("generateFrontierTeam PEUT inclure des runThreeOnly (hippos/Karmaki) — visibles par tous", () => {
        let seen = false
        for (let s = 0; s < 400 && !seen; s++) {
            const team = generateFrontierTeam(new Rng(s * 13 + 3), { streak: 20, level: 60 })
            if (team.some((o) => isRun3(o.speciesId))) seen = true
        }
        expect(seen).toBe(true)
    })

    it("generateFrontierTeam n'inclut JAMAIS un gardien/boss (FRONTIER_UNLOCKS) en BASSE sphère", () => {
        for (let s = 0; s < 60; s++) {
            const team = generateFrontierTeam(new Rng(s * 7 + 1), { streak: 3, level: 60 }) // streak bas
            for (const o of team) expect(FRONTIER_UNLOCKS.has(o.speciesId), o.speciesId).toBe(false)
        }
    })
})
