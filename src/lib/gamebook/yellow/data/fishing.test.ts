import { describe, it, expect } from "vitest"
import { fishingReelBonus } from "./fishing"

describe("pêche — FERRAGE (mashing → IV)", () => {
    it("+1 IV par tranche de 10 appuis", () => {
        expect(fishingReelBonus(0)).toBe(0)
        expect(fishingReelBonus(9)).toBe(0)
        expect(fishingReelBonus(10)).toBe(1)
        expect(fishingReelBonus(19)).toBe(1)
        expect(fishingReelBonus(35)).toBe(3)
        expect(fishingReelBonus(150)).toBe(15)
    })
    it("robuste aux valeurs négatives", () => {
        expect(fishingReelBonus(-5)).toBe(0)
    })
    it("l'appelant plafonne à 15 : base 12 + bonus (35 taps → +3) = 15", () => {
        const cap = (base: number, taps: number) => Math.min(15, base + fishingReelBonus(taps))
        expect(cap(12, 35)).toBe(15)
        expect(cap(2, 35)).toBe(5)
    })
})
import { fishingCommon, fishingRareOfHour, fishingTier, fishingRareLevel, fishingLevel, rollBiteTime, fishingShinyChance, FISHING_SHINY_BASE, FISHING_MAX_WAIT_SEC, FISHING_ROD_ITEM_ID } from "./fishing"
import { hydratePlayer, getPlayer, claimFishingRod } from "../store/playerStore"

describe("Pêche — tirage + courbes", () => {
    it("fishingCommon : braisécaille ou l'espèce EAU du run (50/50), déterministe", () => {
        expect(fishingCommon("run1", 0)).toBe("braisecaille")
        expect(fishingCommon("run1", 0.99)).toBe("loutrille")
        expect(fishingCommon("run2", 0.99)).toBe("tetardoc")
        expect(fishingCommon("run3", 0.99)).toBe("gouttiny")
    })
    it("fishingRareOfHour : Osquille de JOUR (8-20h), Rô de NUIT (20-8h)", () => {
        expect(fishingRareOfHour(8)).toBe("osquille")
        expect(fishingRareOfHour(19)).toBe("osquille")
        expect(fishingRareOfHour(20)).toBe("ro")
        expect(fishingRareOfHour(3)).toBe("ro")
    })
    it("fishingTier : ~40 % rien · Geaucké 1 % (gated) · rare × reps · sinon commun", () => {
        expect(fishingTier(0.1, 1, true)).toBe("none")            // < 0.40
        expect(fishingTier(0.405, 1, true)).toBe("geaucke")       // [0.40, 0.41)
        expect(fishingTier(0.405, 1, false)).toBe("rare")         // Geaucké capturé → sa proba retombe sur le rare
        expect(fishingTier(0.44, 1, true)).toBe("rare")           // fenêtre rare 6 % à reps=1
        expect(fishingTier(0.9, 1, true)).toBe("common")
        expect(fishingTier(0.50, 1, true)).toBe("common")         // hors fenêtre rare à reps=1
        expect(fishingTier(0.50, 1.8, true)).toBe("rare")         // reps ×1.8 élargit la fenêtre (10.8 %)
    })
    it("fishingRareLevel : 50 % bande de badges / 50 % moyenne d'équipe, borné", () => {
        expect(fishingRareLevel(1, 50, 0.9, 0)).toBe(5)     // bande badge 1 = [5,15], bandRand=0
        expect(fishingRareLevel(5, 50, 0.9, 0.99)).toBe(75) // bande badge 5 = [60,75], haut
        expect(fishingRareLevel(3, 42, 0.2, 0)).toBe(42)    // useAvg<0.5 → moyenne d'équipe
    })
    it("fishingLevel : borné [5,100], calé sur la moyenne", () => {
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
