import { describe, it, expect } from "vitest"
import { rollWildEncounter } from "./encounters"

// PRNG déterministe (mulberry32) → flux reproductible pour échantillonner les rencontres.
function mulberry32(a: number) {
    return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
function sample(mapId: string, opts: { ngplus?: boolean; leadLevel: number; levelCap: number }, n = 6000) {
    const rng = mulberry32(0xC0FFEE)
    const seen = new Set<string>()
    for (let i = 0; i < n; i++) {
        const w = rollWildEncounter({ mapId, x: 22, y: 20, leadLevel: opts.leadLevel, weakestTeamLevel: opts.leadLevel, strongestTeamLevel: opts.leadLevel, levelCap: opts.levelCap, encounterCount: 999, ngplus: opts.ngplus, rng })
        if (w) seen.add(w.speciesId)
    }
    return seen
}

describe("Rencontres RUN 2 (NG+) — bascule de pool", () => {
    // Espèces présentes en Route Nord RUN 1 mais ABSENTES du pool run 2.
    const RUN1_ONLY = ["broussours", "electroatiss", "forgeotin", "trolystrik", "pampousse", "auroruff"]

    it("Route Nord en NG+ utilise le pool RUN 2 (nouveaux présents, run-1-only absents)", () => {
        const seen = sample("yellow_route_nord", { ngplus: true, leadLevel: 12, levelCap: 12 })
        // Peu communs run 2 présents (échantillon large) :
        expect(seen.has("blaziper") || seen.has("jerbiwat") || seen.has("bouh") || seen.has("glacirex")).toBe(true)
        // Aucune espèce exclusivement run 1 :
        for (const id of RUN1_ONLY) expect(seen.has(id)).toBe(false)
    })

    it("Route Nord SANS NG+ garde le pool RUN 1 (une espèce run-1-only réapparaît)", () => {
        const seen = sample("yellow_route_nord", { ngplus: false, leadLevel: 20, levelCap: 30 })
        expect(RUN1_ONLY.some((id) => seen.has(id))).toBe(true)
    })
})

describe("Orcaline (Grotte NG+) — gate minLeadLevel = 35", () => {
    it("n'apparaît JAMAIS sous le niveau 35", () => {
        const seen = sample("yellow_grotte", { ngplus: true, leadLevel: 20, levelCap: 30 }, 12000)
        expect(seen.has("orcaline")).toBe(false)
    })
    it("peut apparaître à partir du niveau 35", () => {
        const seen = sample("yellow_grotte", { ngplus: true, leadLevel: 60, levelCap: 60 }, 40000)
        expect(seen.has("orcaline")).toBe(true)
    })
})
