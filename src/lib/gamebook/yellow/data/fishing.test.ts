import { describe, it, expect } from "vitest"
import { pickFishSpecies, fishingLevel, fishingBiteChance, fishingShinyChance, FISHING_POOL, FISHING_SHINY_MAX, FISHING_ROD_ITEM_ID } from "./fishing"
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
    it("fishingBiteChance : ~35 % tout de suite, 100 % dès ~10 s", () => {
        expect(fishingBiteChance(0)).toBeCloseTo(0.35, 5)
        expect(fishingBiteChance(10)).toBe(1)
        expect(fishingBiteChance(60)).toBe(1)
    })
    it("fishingShinyChance : 0 à t=0, MAX à 60 s, strictement croissante (patience → shiny)", () => {
        expect(fishingShinyChance(0)).toBe(0)
        expect(fishingShinyChance(60)).toBeCloseTo(FISHING_SHINY_MAX, 5)
        expect(fishingShinyChance(30)).toBeCloseTo(FISHING_SHINY_MAX / 2, 5)
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
