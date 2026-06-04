import { describe, it, expect } from "vitest"
import { statusCatchBonus, captureValue, tryCapture, type CaptureInput } from "./capture"
import { rarityBonusOf, statusBonusOf } from "../data/captureConfig"
import { Rng } from "./rng"

const base: CaptureInput = { catchRate: 150, currentHp: 100, maxHp: 100, status: "NONE", ballBonus: 1 }

describe("bonus de statut (config)", () => {
    it("sommeil/gel forts, para/brûlure/poison moyens, rien = 1", () => {
        expect(statusCatchBonus("SLEEP")).toBe(2.5)
        expect(statusCatchBonus("FREEZE")).toBe(2.5)
        expect(statusCatchBonus("PARALYSIS")).toBe(1.5)
        expect(statusCatchBonus("BURN")).toBe(1.5)
        expect(statusCatchBonus("POISON")).toBe(1.5)
        expect(statusCatchBonus("NONE")).toBe(1)
        expect(statusBonusOf("SLEEP")).toBe(2.5)
    })
})

describe("coefficient de rareté (config)", () => {
    it("plus c'est rare, plus le coefficient est bas", () => {
        expect(rarityBonusOf("COMMON")).toBe(1.0)
        expect(rarityBonusOf("UNCOMMON")).toBe(0.85)
        expect(rarityBonusOf("RARE")).toBe(0.65)
        expect(rarityBonusOf("LEGENDARY")).toBe(0.1)
        expect(rarityBonusOf(undefined)).toBe(1) // défaut
        expect(rarityBonusOf("INCONNU")).toBe(1)
    })
})

describe("captureValue", () => {
    it("PV pleins → facteur PV = 1/3", () => {
        expect(captureValue(base)).toBeCloseTo(50, 6) // 150 × 1 × 1/3
    })
    it("1 PV → facteur PV proche de 1", () => {
        expect(captureValue({ ...base, currentHp: 1 })).toBeCloseTo(149, 0)
    })
    it("statut (sommeil ×2.5) et Ball (×2) augmentent la valeur", () => {
        expect(captureValue({ ...base, status: "SLEEP" })).toBeCloseTo(125, 6) // 50 × 2.5
        expect(captureValue({ ...base, ballBonus: 2 })).toBeCloseTo(100, 6)    // 50 × 2
    })
    it("la rareté réduit, le bonus extra (quota) augmente", () => {
        expect(captureValue({ ...base, rarityBonus: 0.65 })).toBeCloseTo(32.5, 6) // 50 × 0.65
        expect(captureValue({ ...base, rarityBonus: 0.1 })).toBeCloseTo(5, 6)     // légendaire
        expect(captureValue({ ...base, extraBonus: 1.3 })).toBeCloseTo(65, 6)     // quota atteint
    })
    it("borne les PV entre 0 et max", () => {
        expect(captureValue({ ...base, currentHp: 999 })).toBeCloseTo(50, 6)
        expect(captureValue({ ...base, currentHp: -50 })).toBeCloseTo(150, 6)
    })
})

describe("tryCapture", () => {
    it("capture garantie quand value ≥ calibration (255)", () => {
        const r = tryCapture({ catchRate: 255, currentHp: 1, maxHp: 100, status: "SLEEP", ballBonus: 12 }, new Rng(1))
        expect(r.caught).toBe(true)
        expect(r.shakes).toBe(3)
    })
    it("échec systématique quand value = 0", () => {
        const r = tryCapture({ ...base, catchRate: 0 }, new Rng(1))
        expect(r.caught).toBe(false)
        expect(r.shakes).toBe(0)
    })
    it("déterministe pour une même seed", () => {
        expect(tryCapture(base, new Rng(424242))).toEqual(tryCapture(base, new Rng(424242)))
    })
    it("statistiquement : un commun affaibli se capture bien plus qu'à PV pleins", () => {
        const weak: CaptureInput = { catchRate: 120, currentHp: 6, maxHp: 60, status: "NONE", ballBonus: 1 }
        const full: CaptureInput = { ...weak, currentHp: 60 }
        let cw = 0, cf = 0
        const rw = new Rng(7), rf = new Rng(7)
        for (let i = 0; i < 2000; i++) { if (tryCapture(weak, rw).caught) cw++; if (tryCapture(full, rf).caught) cf++ }
        expect(cw).toBeGreaterThan(cf)
        expect(cw / 2000).toBeGreaterThan(0.3) // affaibli : franchement capturable
    })
})
