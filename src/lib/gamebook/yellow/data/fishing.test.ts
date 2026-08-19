import { describe, it, expect } from "vitest"
import { pickFishSpecies, fishingLevel, rollBiteTime, fishingShinyChance, FISHING_POOL, FISHING_SHINY_BASE, FISHING_MAX_WAIT_SEC, FISHING_ROD_ITEM_ID } from "./fishing"
import { hydratePlayer, getPlayer, claimFishingRod } from "../store/playerStore"

describe("Pêche — pool EAU + courbes", () => {
    it("pickFishSpecies : toujours une espèce du pool, déterministe, pondéré", () => {
        const ids = FISHING_POOL.map((e) => e.speciesId)
        expect(ids).toContain(pickFishSpecies(0))
        expect(pickFishSpecies(0)).toBe("loutrille")        // 1er (poids le + lourd)
        expect(pickFishSpecies(0.999)).toBe("braisecaille") // dernier (le + rare)
        expect(pickFishSpecies(0.3)).toBe(pickFishSpecies(0.3)) // déterministe
    })
    it("fishingLevel : borné [5,100], calé sur le lead", () => {
        expect(fishingLevel(30, 0.5)).toBeGreaterThanOrEqual(5)
        expect(fishingLevel(30, 0.5)).toBeLessThanOrEqual(100)
        expect(fishingLevel(3, 0)).toBe(5)        // plancher
        expect(fishingLevel(100, 0.99)).toBe(100) // plafond
    })
    it("rollBiteTime : borné [2,60], tôt en général, 60 s seulement au bout du rand (rare)", () => {
        expect(rollBiteTime(0)).toBe(2)                       // plancher
        expect(rollBiteTime(0.999999)).toBe(FISHING_MAX_WAIT_SEC) // ne dépasse jamais 60
        const med = rollBiteTime(0.5)
        expect(med).toBeGreaterThanOrEqual(2)
        expect(med).toBeLessThanOrEqual(15)                   // médiane basse (~9 s) → 60 s rare
        expect(rollBiteTime(0.3)).toBe(rollBiteTime(0.3))     // déterministe
    })
    it("fishingShinyChance : PLANCHER = taux normal à t=0, GARANTI à 60 s, croissante", () => {
        expect(fishingShinyChance(0)).toBeCloseTo(FISHING_SHINY_BASE, 6) // plancher = ~1/512 (comme les pas)
        expect(fishingShinyChance(60)).toBeCloseTo(1, 6)                 // parfait garanti à 60 s
        expect(fishingShinyChance(10)).toBeLessThan(0.05)               // reste bas la plupart du temps
        expect(fishingShinyChance(45)).toBeGreaterThan(fishingShinyChance(30)) // strictement croissante
        expect(fishingShinyChance(30)).toBeGreaterThan(fishingShinyChance(10))
    })
})

describe("Pêche — canne offerte UNE fois (claimFishingRod)", () => {
    it("donne la canne si absente, refuse si déjà possédée (pas de doublon)", () => {
        hydratePlayer({ team: [], pc: [], items: {} })
        expect(claimFishingRod()).toBe(true)
        expect(getPlayer().items[FISHING_ROD_ITEM_ID]).toBe(1)
        expect(claimFishingRod()).toBe(false)               // déjà une → pas de re-cadeau
        expect(getPlayer().items[FISHING_ROD_ITEM_ID]).toBe(1)
    })
})
