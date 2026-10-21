import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { funArenaReward, funSprintReward, funDailyZones, funArenaOpen, FUN_ARENA_COUNT } from "../data/funDefis"
import { rarityRepsTarget } from "../data/encounters"
import { startFunDefi, funOnCapture, getFunDefis, abandonFunDefi, hydratePlayer } from "./playerStore"

describe("défis fun — récompenses (fonctions pures)", () => {
    it("arène : 100 (1re) → 300 (5e) selon le n° d'arène", () => {
        expect(funArenaReward(1)).toBe(100)
        expect(funArenaReward(2)).toBe(150)
        expect(funArenaReward(3)).toBe(200)
        expect(funArenaReward(5)).toBe(300)
        expect(funArenaReward(6)).toBe(350) // 6e arène (le bateau s'est intercalé le 21/10/2026)
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

describe("défis fun — Blitz d'arène (20/10/2026 : il se lançait à 5 badges et ne pouvait jamais réussir, question de Rob)", () => {
    it("ouvert tant qu'il reste une arène à conquérir dans le monde, fermé à 6 badges (le bateau = 4e arène)", () => {
        expect(FUN_ARENA_COUNT).toBe(6)
        expect(funArenaOpen(0)).toBe(true)
        expect(funArenaOpen(5)).toBe(true)
        expect(funArenaOpen(6)).toBe(false)
    })
    it("⚠️ à 6 badges, « Lancer » ne crée plus de défi impossible ; avec une arène à conquérir, il se lance", () => {
        hydratePlayer({ badges: ["plante", "roche", "feu", "ancre", "elec", "eau"] }); abandonFunDefi()
        startFunDefi("arena")
        expect(getFunDefis().active).toBeNull()
        hydratePlayer({ badges: ["plante"] })
        startFunDefi("arena")
        expect(getFunDefis().active?.kind).toBe("arena")
        abandonFunDefi()
    })
    it("la carte du labo ne propose plus « Lancer » quand toutes les arènes sont conquises, et le dit", () => {
        const lab = fs.readFileSync(path.join(process.cwd(), "src/app/gamebook/yellow/LabPanel.tsx"), "utf8")
        expect(lab).toContain("{funArenaOpen(player.badges.length)")
        expect(lab).toContain("Les {FUN_ARENA_COUNT} arènes de ce monde sont déjà conquises")
    })
})
