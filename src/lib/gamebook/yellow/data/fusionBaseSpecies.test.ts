import { describe, it, expect } from "vitest"
import { FUSION_BASE_SPECIES, FUSION_BASE_IDS, FUSION_BASE_PARENTS, fusionForParents } from "./fusionBaseSpecies"
import { SPECIES, getSpecies, registerCustomSpecies } from "./species"
import { getMove } from "./moves"

describe("Fusions de base — data + learnsets", () => {
    it("13 fusions (5 de base + 8 exclusives de zone), ids uniques, types valides, base stats plausibles", () => {
        expect(FUSION_BASE_SPECIES.length).toBe(13) // 5 de base (Grotte 1F/B1F fusion-pop) + 8 exclusives de zone
        expect(new Set(FUSION_BASE_IDS).size).toBe(13)
        for (const s of FUSION_BASE_SPECIES) {
            expect(s.types.length, s.id).toBe(2)
            expect(new Set(s.types).size).toBe(2) // 2 types distincts
            const bst = s.baseStats.hp + s.baseStats.atk + s.baseStats.def + s.baseStats.spe + s.baseStats.spc
            expect(bst, s.id).toBeGreaterThan(180) // base-1 plausible
            expect(bst, s.id).toBeLessThan(300)
            expect(s.evolution, s.id).toBeUndefined() // base-1 : pas d'évolution (exception voulue)
            expect(s.dexNo, s.id).toBeGreaterThanOrEqual(500) // plage Fusiodex (hors dex principal)
        }
    })

    it("learnsets : tous les moves EXISTENT + STAB présent + montent haut (≥84)", () => {
        for (const s of FUSION_BASE_SPECIES) {
            for (const l of s.learnset) {
                expect(getMove(l.moveId), `${s.id}:${l.moveId}`).toBeDefined()
            }
            // au moins un move de chaque type de la fusion (STAB)
            for (const t of s.types) {
                const hasStab = s.learnset.some((l) => getMove(l.moveId)?.type === t)
                expect(hasStab, `${s.id} STAB ${t}`).toBe(true)
            }
            // le learnset s'étend jusqu'au haut niveau
            const maxLvl = Math.max(...s.learnset.map((l) => l.level))
            expect(maxLvl, s.id).toBeGreaterThanOrEqual(84)
        }
    })

    it("fusionForParents résout les paires exclusives de zone (ordre indifférent) → la règle de pop les trouvera", () => {
        expect(fusionForParents("goatiny", "guizer")).toBe("givrasol")     // B2F (audit : le pop tourne maintenant en B2F)
        expect(fusionForParents("guizer", "goatiny")).toBe("givrasol")     // ordre indifférent
        expect(fusionForParents("batchu", "draclet")).toBe("voltaile")     // 1F
        expect(fusionForParents("obscurene", "electroatiss")).toBe("abyssvolt") // B1F-1
        expect(fusionForParents("draclet", "electroatiss")).toBe("dractriss")   // paire de BASE distincte (pas de collision avec Voltaile/Oniridrak)
    })

    it("parents référencés existent, et forment bien les paires", () => {
        expect(Object.keys(FUSION_BASE_PARENTS).sort()).toEqual([...FUSION_BASE_IDS].sort())
        for (const [fus, [a, b]] of Object.entries(FUSION_BASE_PARENTS)) {
            expect(SPECIES[a], `parent ${a} de ${fus}`).toBeDefined()
            expect(SPECIES[b], `parent ${b} de ${fus}`).toBeDefined()
        }
    })

    it("ANTI-SPOILER : JAMAIS dans SPECIES (source du Pokédex) → 0 fuite dex, même une fois enregistrées custom en jeu", () => {
        // Elles sont enregistrées comme espèces CUSTOM en jeu (reregisterCustomDaemons) → getSpecies les résout.
        // Mais visibleDexSpecies n'itère QUE SPECIES : tant qu'elles n'y sont pas, le Pokédex ne peut PAS les montrer.
        registerCustomSpecies(FUSION_BASE_SPECIES) // simule l'enregistrement in-game
        for (const s of FUSION_BASE_SPECIES) {
            expect(SPECIES[s.id], `${s.id} ne doit JAMAIS être dans SPECIES (source dex)`).toBeUndefined()
            expect(getSpecies(s.id), `${s.id} résolvable en jeu (custom)`).not.toBeNull() // jouable pour les rencontres
        }
    })
})
