import { describe, it, expect } from "vitest"
import { FUSION_BASE_SPECIES, FUSION_BASE_IDS, FUSION_BASE_PARENTS } from "./fusionBaseSpecies"
import { SPECIES, getSpecies } from "./species"
import { getMove } from "./moves"

describe("Fusions de base — data + learnsets", () => {
    it("5 fusions, ids uniques, types valides, base stats plausibles", () => {
        expect(FUSION_BASE_SPECIES.length).toBe(5)
        expect(new Set(FUSION_BASE_IDS).size).toBe(5)
        for (const s of FUSION_BASE_SPECIES) {
            expect(s.types.length, s.id).toBe(2)
            expect(new Set(s.types).size).toBe(2) // 2 types distincts
            const bst = s.baseStats.hp + s.baseStats.atk + s.baseStats.def + s.baseStats.spe + s.baseStats.spc
            expect(bst, s.id).toBeGreaterThan(180) // base-1 plausible
            expect(bst, s.id).toBeLessThan(300)
            expect(s.hiddenUntilCaught).toBe(true) // masquées
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

    it("parents référencés existent, et forment bien les 5 paires", () => {
        expect(Object.keys(FUSION_BASE_PARENTS).sort()).toEqual([...FUSION_BASE_IDS].sort())
        for (const [fus, [a, b]] of Object.entries(FUSION_BASE_PARENTS)) {
            expect(SPECIES[a], `parent ${a} de ${fus}`).toBeDefined()
            expect(SPECIES[b], `parent ${b} de ${fus}`).toBeDefined()
        }
    })

    it("ANTI-SPOILER : NON enregistrées dans SPECIES → 0 fuite dans le Pokédex/dex", () => {
        for (const s of FUSION_BASE_SPECIES) {
            expect(SPECIES[s.id], `${s.id} ne doit PAS être dans SPECIES`).toBeUndefined()
            expect(getSpecies(s.id), `${s.id} non résolvable tant que non enregistrée`).toBeNull()
        }
    })
})
