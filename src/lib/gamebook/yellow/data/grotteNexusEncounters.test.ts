import { describe, it, expect } from "vitest"
import { hasEncounters, rollWildEncounter } from "./encounters"
import { fusionForParents, FUSION_BASE_IDS, FUSION_BASE_PARENTS, FUSION_BASE_SPECIES } from "./fusionBaseSpecies"
import { getSpecies } from "./species"
import { createMonInstance } from "../battle/factory"
import { reregisterCustomDaemons } from "../store/playerStore"

describe("Grotte du Nexus 1F — rencontres + règle de pop", () => {
    it("la Grotte du Nexus a des rencontres activées", () => {
        expect(hasEncounters("yellow_grotte_nexus")).toBe(true)
    })

    it("fusionForParents : reconnaît les 5 paires (2 sens) + null hors paire", () => {
        for (const [fus, [a, b]] of Object.entries(FUSION_BASE_PARENTS)) {
            expect(fusionForParents(a, b)).toBe(fus)
            expect(fusionForParents(b, a)).toBe(fus) // ordre indifférent
        }
        expect(fusionForParents("mottoche", "piouflot")).toBeNull() // parents de 2 fusions différentes → pas de paire
        expect(fusionForParents("pikachu", "salameche")).toBeNull()
    })

    it("les 5 fusions ne sont PAS dans le pool sauvage (elles n'arrivent QUE par la règle de pop)", () => {
        // 400 rolls de la Grotte : aucune fusion ne doit sortir du tirage normal (les fusions passent par gameStore).
        let seed = 1
        const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
        const seen = new Set<string>()
        for (let i = 0; i < 400; i++) {
            const w = rollWildEncounter({ mapId: "yellow_grotte_nexus", x: 5, y: 5, leadLevel: 30, caughtSpecies: [], rng })
            if (w) seen.add(w.speciesId)
        }
        expect(seen.size).toBeGreaterThan(3) // le pool tourne
        for (const fid of FUSION_BASE_IDS) expect(seen.has(fid), `${fid} ne doit PAS pop au tirage`).toBe(false)
    })

    it("enregistrement : les 5 fusions deviennent résolvables + instanciables (base-1, learnset)", () => {
        reregisterCustomDaemons() // enregistre FUSION_BASE_SPECIES (custom)
        for (const s of FUSION_BASE_SPECIES) {
            expect(getSpecies(s.id), s.id).not.toBeNull()
            const mon = createMonInstance(s.id, 12, { owned: false })
            expect(mon.speciesId).toBe(s.id)
            expect(mon.level).toBe(12)
            expect(mon.moves.length).toBeGreaterThan(0) // learnset appliqué
        }
    })
})
