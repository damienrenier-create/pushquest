import { describe, it, expect } from "vitest"
import { maxHp, computeStat, stageMultiplier, accEvaMultiplier, clampStage, effectiveStat } from "./stats"
import type { SpeciesData } from "./types"

const sp = {
    baseStats: { hp: 45, atk: 49, def: 49, spe: 45, spc: 65 },
} as SpeciesData

describe("maxHp / computeStat (formules Gen 1)", () => {
    it("PV max = floor((2*base+iv)*lvl/100) + lvl + 10", () => {
        // (2*45+15)*50/100 = 52.5 → 52 ; +50+10 = 112.
        expect(maxHp(sp, 50, 15)).toBe(112)
    })
    it("stat normale = floor((2*base+iv)*lvl/100) + 5", () => {
        // (2*49+15)*50/100 = 56.5 → 56 ; +5 = 61.
        expect(computeStat(49, 15, 50)).toBe(61)
    })
    it("niveau 1 reste cohérent", () => {
        expect(maxHp(sp, 1, 0)).toBe(11)   // floor(90/100)=0 +1+10
        expect(computeStat(49, 0, 1)).toBe(5) // floor(98/100)=0 +5
    })
})

describe("stageMultiplier (table de combat ±6)", () => {
    it("neutre = 1", () => expect(stageMultiplier(0)).toBe(1))
    it("positifs = (2+s)/2", () => {
        expect(stageMultiplier(1)).toBeCloseTo(1.5, 6)
        expect(stageMultiplier(6)).toBe(4)
    })
    it("négatifs = 2/(2-s)", () => {
        expect(stageMultiplier(-1)).toBeCloseTo(2 / 3, 6)
        expect(stageMultiplier(-6)).toBe(0.25)
    })
    it("clampe au-delà de ±6", () => {
        expect(stageMultiplier(99)).toBe(4)
        expect(stageMultiplier(-99)).toBe(0.25)
    })
})

describe("accEvaMultiplier (précision/esquive, base 3/3)", () => {
    it("neutre = 1", () => expect(accEvaMultiplier(0)).toBe(1))
    it("positifs = (3+s)/3, négatifs = 3/(3-s)", () => {
        expect(accEvaMultiplier(1)).toBeCloseTo(4 / 3, 6)
        expect(accEvaMultiplier(-1)).toBeCloseTo(3 / 4, 6)
    })
})

describe("clampStage", () => {
    it("borne à [-6, 6]", () => {
        expect(clampStage(10)).toBe(6)
        expect(clampStage(-10)).toBe(-6)
        expect(clampStage(3)).toBe(3)
    })
})

describe("effectiveStat (stage + statut)", () => {
    it("brûlure divise l'Attaque par 2", () => {
        expect(effectiveStat(100, "atk", 0, "BURN")).toBe(50)
        expect(effectiveStat(100, "atk", 0, "NONE")).toBe(100)
    })
    it("paralysie divise la Vitesse par 2", () => {
        expect(effectiveStat(100, "spe", 0, "PARALYSIS")).toBe(50)
    })
    it("la brûlure ne touche pas la Vitesse", () => {
        expect(effectiveStat(100, "spe", 0, "BURN")).toBe(100)
    })
    it("applique le stage avant le statut", () => {
        // +1 atk = ×1.5 → 150, puis brûlure /2 → 75.
        expect(effectiveStat(100, "atk", 1, "BURN")).toBe(75)
    })
    it("ne descend jamais sous 1", () => {
        expect(effectiveStat(1, "atk", -6, "BURN")).toBe(1)
    })
})
