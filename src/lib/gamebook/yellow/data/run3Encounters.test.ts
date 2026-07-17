import { describe, it, expect } from "vitest"
import { rollWildEncounter } from "./encounters"

// PRNG déterministe (mulberry32) → flux reproductible pour échantillonner les rencontres du run 3.
function mulberry32(a: number) {
    return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
function sample(mapId: string, opts: { leadLevel: number; levelCap: number; caughtSpecies?: string[] }, n = 8000) {
    const rng = mulberry32(0xC0FFEE)
    const seen = new Map<string, number>() // speciesId → un niveau observé
    for (let i = 0; i < n; i++) {
        const w = rollWildEncounter({ mapId, x: 22, y: 20, leadLevel: opts.leadLevel, weakestTeamLevel: opts.leadLevel, strongestTeamLevel: opts.leadLevel, levelCap: opts.levelCap, encounterCount: 999, run3: true, caughtSpecies: opts.caughtSpecies, rng })
        if (w) seen.set(w.speciesId, w.level)
    }
    return seen
}

describe("Rencontres RUN 3 — pool inédit (RUN3_ZONES)", () => {
    it("Route Nord run 3 : espèces inédites présentes, pool run 1 absent", () => {
        const seen = sample("yellow_route_nord", { leadLevel: 15, levelCap: 30 })
        for (const id of ["plumiot", "tamanpousse", "colibraise", "hibouh", "lavapetit", "revemante"]) expect(seen.has(id), id).toBe(true)
        // pool run 1 non repris (couperin/electroatiss/broussours) + CRÉATIONS retirées (→ Grotte du Nexus puzzle)
        for (const id of ["couperin", "electroatiss", "broussours", "guizer", "gavillus", "goatiny"]) expect(seen.has(id), id).toBe(false)
    })

    it("Grotte run 3 : Marmoterre RETIRÉ, starters run 1 présents, mottoche toujours niveau 5", () => {
        const seen = sample("yellow_grotte", { leadLevel: 20, levelCap: 30 })
        expect(seen.has("marmoterre")).toBe(false) // retiré → exclusif au troc Ruffiant→Marmoterre
        for (const id of ["guizer", "shady"]) expect(seen.has(id), id).toBe(false) // créations retirées → Grotte du Nexus puzzle
        expect(seen.has("sporbeo")).toBe(true)
        expect(seen.has("gouttiny") || seen.has("feuillichot") || seen.has("braisille")).toBe(true) // clin d'œil aux starters run 1
        expect(seen.get("mottoche")).toBe(5) // levelFixed 5 (fodder)
    })

    it("Panthéon (Route Nord run 3) : catchOnce → ne repop plus une fois capturé", () => {
        expect(sample("yellow_route_nord", { leadLevel: 15, levelCap: 30 }).has("pantheon")).toBe(true)
        expect(sample("yellow_route_nord", { leadLevel: 15, levelCap: 30, caughtSpecies: ["pantheon"] }).has("pantheon")).toBe(false)
    })

    it("Orcaline (Grotte run 3) : gate minLeadLevel 35", () => {
        expect(sample("yellow_grotte", { leadLevel: 20, levelCap: 30 }, 12000).has("orcaline")).toBe(false)
        expect(sample("yellow_grotte", { leadLevel: 60, levelCap: 60 }, 40000).has("orcaline")).toBe(true)
    })
})
