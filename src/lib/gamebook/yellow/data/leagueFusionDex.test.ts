import { describe, it, expect } from "vitest"
import { leagueFusionSpecies, leagueFusionIdForParents, leagueFusionId, leagueFusionIds } from "./leagueFusionDex"
import { allEncounterableFusionDefs } from "./fusionLeague"

describe("leagueFusionDex — fiches de fusion de la Ligue", () => {
    const species = leagueFusionSpecies()

    it("dérive une fiche par fusion affrontable (>= 30), sans crash", () => {
        expect(species.length).toBeGreaterThanOrEqual(30)
        // toutes les défs dont les 2 parents se résolvent doivent avoir une fiche
        expect(species.length).toBeLessThanOrEqual(allEncounterableFusionDefs().length)
    })

    it("chaque fiche est complète (types, stats, learnset, sprite, dexNo 550+)", () => {
        for (const s of species) {
            expect(s.types.length).toBeGreaterThanOrEqual(1)
            expect(s.baseStats.hp).toBeGreaterThan(0)
            expect(s.learnset.length).toBeGreaterThanOrEqual(1)
            expect(s.sprite).toMatch(/\.png$/)
            expect(s.dexNo).toBeGreaterThanOrEqual(550)
            expect(s.description.length).toBeGreaterThan(0)
        }
    })

    it("ids uniques + dexNo uniques", () => {
        expect(new Set(species.map((s) => s.id)).size).toBe(species.length)
        expect(new Set(species.map((s) => s.dexNo)).size).toBe(species.length)
    })

    it("mappe une paire de parents connue → id de fiche (ordre indifférent)", () => {
        const id = leagueFusionIdForParents("divinpate", "aquilord") // → Divinaquil (WILL)
        expect(id).toBe(leagueFusionId("Divinaquil"))
        expect(leagueFusionIdForParents("aquilord", "divinpate")).toBe(id) // ordre indifférent
        expect(leagueFusionIds()).toContain(id)
    })

    it("une paire inconnue (non-Ligue) → null", () => {
        expect(leagueFusionIdForParents("feuillichot", "broutame")).toBeNull()
    })
})
