import { describe, it, expect } from "vitest"
import { statusCatchBonus, captureValue, tryCapture, type CaptureInput } from "./capture"
import { Rng } from "./rng"

const base: CaptureInput = { catchRate: 150, currentHp: 100, maxHp: 100, status: "NONE", ballBonus: 1 }

describe("statusCatchBonus", () => {
    it("sommeil/gel = 2, poison/para/brûlure = 1.5, rien = 1", () => {
        expect(statusCatchBonus("SLEEP")).toBe(2)
        expect(statusCatchBonus("FREEZE")).toBe(2)
        expect(statusCatchBonus("POISON")).toBe(1.5)
        expect(statusCatchBonus("PARALYSIS")).toBe(1.5)
        expect(statusCatchBonus("BURN")).toBe(1.5)
        expect(statusCatchBonus("NONE")).toBe(1)
    })
})

describe("captureValue", () => {
    it("PV pleins → facteur PV = 1/3", () => {
        // 150 * 1 * (1/3) * 1 = 50.
        expect(captureValue(base)).toBeCloseTo(50, 6)
    })
    it("1 PV → facteur PV proche de 1", () => {
        const v = captureValue({ ...base, currentHp: 1 })
        // (3*100-2)/300 = 0.9933 → 150 * 0.9933 ≈ 149.
        expect(v).toBeCloseTo(149, 0)
    })
    it("le statut et la Ball augmentent la valeur", () => {
        expect(captureValue({ ...base, status: "SLEEP" })).toBeCloseTo(100, 6)
        expect(captureValue({ ...base, ballBonus: 2 })).toBeCloseTo(100, 6)
    })
    it("borne les PV courants entre 0 et max", () => {
        expect(captureValue({ ...base, currentHp: 999 })).toBeCloseTo(50, 6) // clampé à max
        expect(captureValue({ ...base, currentHp: -50 })).toBeCloseTo(150, 6) // clampé à 0
    })
})

describe("tryCapture", () => {
    it("capture garantie quand value >= 255 (sans consommer le RNG)", () => {
        const r = tryCapture({ catchRate: 255, currentHp: 1, maxHp: 100, status: "SLEEP", ballBonus: 12 }, new Rng(1))
        expect(r.caught).toBe(true)
        expect(r.shakes).toBe(3)
    })
    it("échec systématique quand value = 0 (catchRate 0)", () => {
        const r = tryCapture({ ...base, catchRate: 0 }, new Rng(1))
        expect(r.caught).toBe(false)
        expect(r.shakes).toBe(0)
    })
    it("est déterministe pour une même seed", () => {
        const a = tryCapture(base, new Rng(424242))
        const b = tryCapture(base, new Rng(424242))
        expect(a).toEqual(b)
    })
})
