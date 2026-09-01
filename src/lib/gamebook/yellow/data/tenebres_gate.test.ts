import { describe, it, expect } from "vitest"
import { rollWildEncounter } from "./encounters"
import { baseSpeciesOf } from "./ace"
import { fishingCommon } from "./fishing"

// GATE TÉNÈBRES — run 1 PRÉ-SYLVEBARBE : les créatures TÉNÈBRES atteignables tôt (Plage : Sépulcru jour /
//   Obscurène nuit ; pêche Cendreville : Obscurène) ne doivent PAS être capturables tant que Sylvebarbe n'est pas
//   vaincu (type tardif = run 3). Elles REVIENNENT une fois l'endgame ouvert (sylvebarbeAwake) et en run 2/3.

function plageBases(hour: number, sylvebarbeAwake: boolean, n = 8000): Set<string> {
    const out = new Set<string>()
    for (let i = 0; i < n; i++) {
        const m = rollWildEncounter({ mapId: "yellow_plage", x: 4, y: 20, leadLevel: 30, hour, sylvebarbeAwake, encounterCount: 999, rng: Math.random })
        if (m) out.add(baseSpeciesOf(m.speciesId))
    }
    return out
}

describe("Gate TÉNÈBRES — Plage (run 1 pré-Sylvebarbe)", () => {
    it("AVANT Sylvebarbe : ni Sépulcru (jour) ni Obscurène (nuit) ne poppent", () => {
        expect(plageBases(12, false).has("sepulcru")).toBe(false)  // 12h = jour (fenêtre de Sépulcru)
        expect(plageBases(23, false).has("obscurene")).toBe(false) // 23h = nuit (fenêtre d'Obscurène)
    })
    it("APRÈS Sylvebarbe : elles reviennent (endgame ouvert)", () => {
        expect(plageBases(12, true).has("sepulcru")).toBe(true)
        expect(plageBases(23, true).has("obscurene")).toBe(true)
    })
    it("témoin : un commun de la Plage (Plumiot) pop dans les deux cas (le gate ne casse pas la zone)", () => {
        expect(plageBases(12, false).has("plumiot")).toBe(true)
        expect(plageBases(12, true).has("plumiot")).toBe(true)
    })
})

describe("Gate TÉNÈBRES — pêche (eau de Cendreville)", () => {
    it("Obscurène retiré du commun pêché avant Sylvebarbe, présent après", () => {
        expect(fishingCommon("yellow_cendreville", "run1", 0, false)).not.toBe("obscurene") // pré-Sylvebarbe → fallback run-1
        expect(fishingCommon("yellow_cendreville", "run1", 0, true)).toBe("obscurene")        // post-Sylvebarbe → signature
    })
    it("par défaut (sans flag), la signature TÉNÈBRES reste (rétro-compat : run 2/3 & appels existants)", () => {
        expect(fishingCommon("yellow_cendreville", "run1", 0)).toBe("obscurene")
    })
})
