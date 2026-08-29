import { describe, it, expect } from "vitest"
import { SPECIES, CANONICAL_NEMESIS, CANONIZED_CUSTOM_ALIAS } from "./species"
import { speciesAtLevel } from "./ace"
import { MOVES } from "./moves"
import { CANONIZED_CUSTOM_SPRITES } from "../create/customSpecies"
import { ownCreationNemesisSpecies } from "../store/playerStore"

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

// LOT A — Possyl CANONISÉE (Grotte du Nexus) + intégration.
describe("Possyl canonisée + intégration (Lot A)", () => {
    it("Possyl → Possombre → Nécrossum canoniques (NORMAL→NORMAL/SPECTRE, dex 210-212, évo 22/40)", () => {
        expect(SPECIES.possyl?.types).toEqual(["NORMAL"])
        expect(SPECIES.possombre?.types).toEqual(["NORMAL"])
        expect(SPECIES.necrossum?.types).toEqual(["NORMAL", "SPECTRE"])
        expect(SPECIES.possyl.dexNo).toBe(210)
        expect(SPECIES.possombre.dexNo).toBe(211)
        expect(SPECIES.necrossum.dexNo).toBe(212)
        expect(speciesAtLevel("possyl", 30)).toBe("possombre")
        expect(speciesAtLevel("possyl", 50)).toBe("necrossum")
    })

    it("Nécrossum = mur physique lent fidèle (BST 455, Déf 115, Vit 50)", () => {
        const s = SPECIES.necrossum.baseStats
        expect(s.hp + s.atk + s.def + s.spe + s.spc).toBe(455)
        expect(s.def).toBe(115)
        expect(s.spe).toBe(50)
    })

    it("wiring canonisation : alias custom→canonique, sprites locaux, némésis canonique → Charolyx", () => {
        expect(CANONIZED_CUSTOM_ALIAS.custom_cmsvywl6u0001xka_possyl_s3).toBe("necrossum")
        const sprites = CANONIZED_CUSTOM_SPRITES.custom_cmsvywl6u0001xka_possyl
        expect(sprites?.[0]).toContain("possyl")
        expect(sprites?.[2]).toContain("necrossum")
        for (const id of ["possyl", "possombre", "necrossum"]) expect(CANONICAL_NEMESIS[id]).toBe("charolyx")
    })

    it("ownCreationNemesisSpecies : vide par défaut (aucune création possédée → aucun blocage)", () => {
        expect(ownCreationNemesisSpecies()).toEqual([])
    })
})
