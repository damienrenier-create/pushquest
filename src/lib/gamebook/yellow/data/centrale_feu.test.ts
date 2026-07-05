import { describe, it, expect } from "vitest"
import { rollWildEncounter } from "./encounters"
import { getSpecies } from "./species"

// CENTRALE FEU (run 2) : niveaux 100% contrôlés (levelFixed/levelRange), couvoir 60/30/10, Pyropanthe one-time.
const MAP = "yellow_centrale"
function roll(caught: string[] = []) {
    return rollWildEncounter({ mapId: MAP, x: 5, y: 5, leadLevel: 40, ngplus: true, encounterCount: 999, rng: Math.random, caughtSpecies: caught })
}

describe("Centrale Feu (run 2) — couvoir + Pyropanthe one-time", () => {
    it("100% FEU, aux stades/niveaux contrôlés (base sous l'évo, finals fixes)", () => {
        const seen = new Map<string, Set<number>>()
        for (let i = 0; i < 5000; i++) {
            const m = roll()
            if (!m) continue
            if (!seen.has(m.speciesId)) seen.set(m.speciesId, new Set())
            seen.get(m.speciesId)!.add(m.level)
        }
        // Le réacteur (lignée Boltah) couve : Boltah reste base (N15), Heatah à N35, Thundah à N40.
        expect([...(seen.get("boltah") ?? [])]).toEqual([15])
        expect([...(seen.get("heatah") ?? [])]).toEqual([35])
        expect([...(seen.get("thundah") ?? [])]).toEqual([40])
        // Toute espèce vue est de type FEU (aucune fuite hors-thème).
        for (const sp of seen.keys()) expect(getSpecies(sp)?.types ?? []).toContain("FEU")
        // La pépite N50 existe bien dans le pool.
        expect([...(seen.get("pyropanthe") ?? [])].every((l) => l === 50)).toBe(true)
    })

    it("Pyropanthe : présente par défaut, mais ne repop JAMAIS une fois au Pokédex (catchOnce)", () => {
        let sawWithout = false
        for (let i = 0; i < 12000 && !sawWithout; i++) if (roll()?.speciesId === "pyropanthe") sawWithout = true
        expect(sawWithout).toBe(true) // témoin : elle apparaît sans le flag
        for (let i = 0; i < 12000; i++) expect(roll(["pyropanthe"])?.speciesId).not.toBe("pyropanthe")
    })
})
