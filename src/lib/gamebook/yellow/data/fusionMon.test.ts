import { describe, it, expect } from "vitest"
import { buildFusion, disposeFusion, fusionParentFromInstance } from "./fusionMon"
import { createMonInstance } from "../battle/factory"
import { getSpecies } from "./species"
import { fullStats } from "../battle/stats"
import { createBattle, resolveTurn } from "../battle/engine"

describe("fusionMon — builder du BattleMon fusionné", () => {
    it("buildFusion : frozenStats à 5 stats (Spéciale unique), PAS de frozenSpd + moveset/niveau/PV", () => {
        const a = createMonInstance("divinpate", 50)
        const b = createMonInstance("razmaree", 50)
        const { instance, speciesId, result } = buildFusion(a, b)

        expect(instance.frozenStats).toBeDefined()
        expect(instance.frozenSpd).toBeUndefined()                   // plus de split SpA/SpD sur les fusions
        expect(instance.frozenStats!.spc).toBe(result.stats.spc)     // Spéciale unique, lue en offense ET défense
        // Spéciale unique = 0,6 × la meilleure Spé des 2 parents + 0,45 × la moindre
        const spcA = fullStats(a, getSpecies("divinpate")!).spc, spcB = fullStats(b, getSpecies("razmaree")!).spc
        expect(result.stats.spc).toBe(Math.round(0.6 * Math.max(spcA, spcB) + 0.45 * Math.min(spcA, spcB)))

        expect(getSpecies(speciesId)).not.toBeNull()               // espèce éphémère enregistrée
        expect(getSpecies(speciesId)!.types).toEqual(result.types) // typage stat-fidèle
        expect(instance.moves.map((m) => m.moveId)).toEqual(result.moves)
        expect(instance.level).toBe(50)
        expect(instance.currentHp).toBe(result.stats.hp)

        disposeFusion(speciesId)
        expect(getSpecies(speciesId)).toBeNull() // dé-fusion propre : l'espèce disparaît du registre
    })

    it("les 2 parents ne sont PAS mutés par la fusion", () => {
        const a = createMonInstance("maitrezenc", 55)
        const b = createMonInstance("zappeureal", 60)
        const snapA = JSON.stringify(a), snapB = JSON.stringify(b)
        const { speciesId } = buildFusion(a, b)
        expect(JSON.stringify(a)).toBe(snapA)
        expect(JSON.stringify(b)).toBe(snapB)
        disposeFusion(speciesId)
    })

    it("le fusionné est un combattant VALIDE : il inflige des dégâts (offense via SpA, pas de crash)", () => {
        // parent rapide avec un move OFFENSIF en slot 1 (le moveset prend ses 2 premières attaques)
        const fast = createMonInstance("divinpate", 55, { moveIds: ["choc_mental", "vague_mentale", "meteores", "leche"] })
        const { instance, speciesId } = buildFusion(fast, createMonInstance("razmaree", 55))
        const enemy = createMonInstance("cailloutchi", 40)
        let s = createBattle([instance], [enemy], { isWild: true, seed: 7 })
        const hp0 = s.enemy.team[0].currentHp
        s = resolveTurn(s, { kind: "move", moveIndex: 0 }) // 1re attaque = 1er move du parent rapide
        expect(s.enemy.team[0].currentHp).toBeLessThan(hp0)   // le fusionné a bien frappé
        disposeFusion(speciesId)
    })

    it("objet tenu : le 1er objet des parents est appliqué (le 2e attend l'extension moteur)", () => {
        const a = createMonInstance("divinpate", 50); a.heldItem = "obj_a"
        const b = createMonInstance("razmaree", 50) // pas d'objet
        const { instance, speciesId } = buildFusion(a, b)
        expect(instance.heldItem).toBe("obj_a")
        disposeFusion(speciesId)
    })

    it("fusionParentFromInstance : stats FINALES (leveled), pas les stats de base", () => {
        const a = createMonInstance("razmaree", 80)
        const p = fusionParentFromInstance(a)
        expect(p.stats.hp).toBeGreaterThan(getSpecies("razmaree")!.baseStats.hp) // niv 80 ≫ base
        expect(p.level).toBe(80)
    })
})
