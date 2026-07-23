import { describe, it, expect } from "vitest"
import { rollWildEncounter, hasEncounters, speciesZones, type EncounterCtx } from "./encounters"

// RNG déterministe (mulberry32) pour un test reproductible.
function mulberry(seed: number): () => number {
    let a = seed >>> 0
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

const POWERFUL = new Set(["alirocaillus", "mouflorage", "mobyd", "phoechaudiii", "karatame", "shadow", "tenebrir", "condombre", "leviabysse", "uzumaro"])
const CREATIONS = new Set(["goatiny", "guizer", "bidouzen"])

describe("Grotte du Nexus B2F — sanctuaire des créations", () => {
    it("rencontres ACTIVES + les créations/finales/némésis y sont référencées (Pokédex zones)", () => {
        expect(hasEncounters("yellow_grotte_nexus_b2f")).toBe(true)
        expect(speciesZones("goatiny")).toContain("yellow_grotte_nexus_b2f")   // base catchable
        expect(speciesZones("mobyd")).toContain("yellow_grotte_nexus_b2f")     // création finale
        expect(speciesZones("condombre")).toContain("yellow_grotte_nexus_b2f") // némésis finale
    })

    it("les finales PUISSANTES poppent à niv 75, TRÈS dures (captureMult 0.45) + raillerie ; les bases à ~niv 25", () => {
        const ctx: EncounterCtx = { mapId: "yellow_grotte_nexus_b2f", x: 10, y: 10, leadLevel: 90, rng: mulberry(12345), encounterCount: 999 }
        let powerful = null as ReturnType<typeof rollWildEncounter> | null
        let creation = null as ReturnType<typeof rollWildEncounter> | null
        for (let i = 0; i < 40000 && !(powerful && creation); i++) {
            const m = rollWildEncounter(ctx)
            if (!m) continue
            if (POWERFUL.has(m.speciesId)) powerful = m
            else if (CREATIONS.has(m.speciesId)) creation = m
        }
        // Une finale puissante : niv 75, capture très dure + message de raillerie.
        //   (captureMult/captureTaunt sont des champs BattleMon posés au runtime via Object.assign → cast pour les lire.)
        expect(powerful, "aucune finale puissante popée sur 40000 rolls").toBeTruthy()
        expect(powerful!.level).toBe(75)
        const pw = powerful as unknown as { captureMult?: number; captureTaunt?: string }
        expect(pw.captureMult).toBe(0.45)
        expect(pw.captureTaunt).toBeTruthy()
        // Une base création : catchable à ~niv 25 (23-27), sans le malus de capture.
        expect(creation, "aucune base création popée").toBeTruthy()
        expect(creation!.level).toBeGreaterThanOrEqual(23)
        expect(creation!.level).toBeLessThanOrEqual(27)
        expect((creation as unknown as { captureTaunt?: string }).captureTaunt).toBeUndefined()
    })
})
