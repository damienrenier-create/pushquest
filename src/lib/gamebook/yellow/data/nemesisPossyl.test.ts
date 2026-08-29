import { describe, it, expect } from "vitest"
import { SPECIES, CANONICAL_NEMESIS } from "./species"
import { speciesAtLevel } from "./ace"
import { MOVES } from "./moves"

// NÉMÉSIS de Possyl (création de Zyran) : lignée CHAROLYX → BUBOLYX → PESTILYX (TÉNÈBRES/POISON, mur-draineur).
describe("némésis de Possyl — lignée Charolyx (lynx charognard)", () => {
    it("les 3 stades existent, TÉNÈBRES/POISON, aux dex 207-209", () => {
        for (const id of ["charolyx", "bubolyx", "pestilyx"]) {
            expect(SPECIES[id], id).toBeDefined()
            expect(SPECIES[id].types).toEqual(["TENEBRES", "POISON"])
            expect(SPECIES[id].hiddenUntilCaught).toBe(true)
        }
        expect(SPECIES.charolyx.dexNo).toBe(207)
        expect(SPECIES.bubolyx.dexNo).toBe(208)
        expect(SPECIES.pestilyx.dexNo).toBe(209)
    })

    it("la chaîne d'évolution monte Charolyx → Bubolyx (22) → Pestilyx (40)", () => {
        expect(speciesAtLevel("charolyx", 10)).toBe("charolyx")
        expect(speciesAtLevel("charolyx", 30)).toBe("bubolyx")
        expect(speciesAtLevel("charolyx", 50)).toBe("pestilyx")
    })

    it("l'apex Pestilyx est le mur-draineur voulu (BST 455, Atq dumpée, Spé/Déf hautes)", () => {
        const s = SPECIES.pestilyx.baseStats
        const bst = s.hp + s.atk + s.def + s.spe + s.spc
        expect(bst).toBe(455)
        expect(s.atk).toBe(20)                 // Atq dumpée (aucune attaque physique réelle)
        expect(s.spe).toBeGreaterThan(50)      // double Possyl (Vit 50) → une longueur d'avance
        expect(s.def).toBeGreaterThanOrEqual(120)
        expect(s.spc).toBeGreaterThanOrEqual(120)
    })

    it("ACE de Zyran fielde bien la lignée : ses ids custom Possyl → charolyx", () => {
        expect(CANONICAL_NEMESIS.custom_cmsvywl6u0001xka_possyl_s1).toBe("charolyx")
        expect(CANONICAL_NEMESIS.custom_cmsvywl6u0001xka_possyl_s2).toBe("charolyx")
        expect(CANONICAL_NEMESIS.custom_cmsvywl6u0001xka_possyl_s3).toBe("charolyx")
    })

    it("la signature Atrophie : Poison, priorité, −2 Atq au lanceur ET à la cible", () => {
        const m = MOVES.atrophie
        expect(m).toBeDefined()
        expect(m.type).toBe("POISON")
        expect(m.priority).toBe(1)
        expect(m.power).toBe(0)
        const changes = m.effect?.statChanges ?? []
        const self = changes.find((c) => c.target === "self")
        const target = changes.find((c) => c.target === "target")
        expect(self).toMatchObject({ stat: "atk", stages: -2 })
        expect(target).toMatchObject({ stat: "atk", stages: -2 })
    })

    it("le learnset de l'apex porte bien sa signature + le cœur du kit", () => {
        const ids = SPECIES.pestilyx.learnset.map((l) => l.moveId)
        for (const need of ["atrophie", "toxik", "vampigraine", "linceul", "devoreur_ombres"]) {
            expect(ids, need).toContain(need)
        }
    })
})
