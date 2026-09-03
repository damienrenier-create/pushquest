import { describe, it, expect } from "vitest"
import { funArenaReward, funSprintReward, funDailyZones } from "../data/funDefis"
import { rarityRepsTarget } from "../data/encounters"
import { startFunDefi, funOnCapture, getFunDefis, abandonFunDefi } from "./playerStore"

describe("défis fun — récompenses (fonctions pures)", () => {
    it("arène : 100 (1re) → 300 (5e) selon le n° d'arène", () => {
        expect(funArenaReward(1)).toBe(100)
        expect(funArenaReward(2)).toBe(150)
        expect(funArenaReward(3)).toBe(200)
        expect(funArenaReward(5)).toBe(300)
    })
    it("sprint : 75 × N", () => {
        expect(funSprintReward(3)).toBe(225)
        expect(funSprintReward(6)).toBe(450)
    })
    it("rareté → reps, bornée 40-160", () => {
        expect(rarityRepsTarget(100)).toBe(40)   // COMMON
        expect(rarityRepsTarget(45)).toBe(70)    // UNCOMMON
        expect(rarityRepsTarget(14)).toBe(100)   // RARE
        expect(rarityRepsTarget(5)).toBe(130)    // VERY_RARE
        expect(rarityRepsTarget(2)).toBe(160)    // giga-rare
    })
    it("zones accessibles du « Pokémon du jour » (union, + Centrale/Manoir)", () => {
        expect(funDailyZones([], [])).toEqual(["yellow_route_nord"])
        expect(funDailyZones(["plante"], [])).toContain("yellow_grotte")
        expect(funDailyZones(["plante", "roche"], [])).toContain("yellow_grotte_gelee")
        expect(funDailyZones(["plante", "roche", "feu"], [])).toEqual(expect.arrayContaining(["yellow_plage", "yellow_centrale"]))
        expect(funDailyZones(["plante", "roche", "feu", "elec"], [])).toContain("yellow_hautes_herbes")
        // Manoir : SEULEMENT après un des 2 boss Aqua battu
        expect(funDailyZones(["feu"], [])).not.toContain("yellow_maison_hantee")
        expect(funDailyZones(["feu"], ["y_aqua_boss_b"])).toContain("yellow_maison_hantee")
    })
})

describe("défis fun — sprint (échelle + crédit auto)", () => {
    it("N espèces distinctes → crédit, échelle +1 (jamais reset), doublon ignoré", () => {
        abandonFunDefi()
        startFunDefi("sprint") // objectif = échelle courante (défaut 3)
        expect(getFunDefis().active?.kind).toBe("sprint")
        expect(getFunDefis().active?.target).toBe(3)
        expect(funOnCapture("a")).toBeNull()
        expect(funOnCapture("b")).toBeNull()
        expect(funOnCapture("a")).toBeNull()          // même espèce → ne compte pas
        const r = funOnCapture("c")                   // 3e espèce DISTINCTE → réussite
        expect(r?.kind).toBe("sprint")
        expect(getFunDefis().active).toBeNull()        // défi consommé
        expect(getFunDefis().ladder).toBe(4)           // échelle +1
    })
})
