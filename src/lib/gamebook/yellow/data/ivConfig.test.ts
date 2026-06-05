import { describe, it, expect } from "vitest"
import { rollIvs, ivTotal, ivTier, IV_FLOOR_AT_QUOTA } from "./ivConfig"

const zero = () => 0          // rng minimal → pas de parfait, chaque IV = plancher
const hi = () => 0.9999       // rng maximal → chaque IV = 15

describe("IV pilotés par l'effort", () => {
    it("quota bouclé → plancher élevé (rng min = plancher)", () => {
        const ivs = rollIvs(zero, 1, 0)
        for (const v of Object.values(ivs)) expect(v).toBe(IV_FLOOR_AT_QUOTA)
    })
    it("jour off → plancher 0 (IV peuvent être nuls)", () => {
        const ivs = rollIvs(zero, 0, 0)
        for (const v of Object.values(ivs)) expect(v).toBe(0)
    })
    it("rng max → IV au plafond (15)", () => {
        const ivs = rollIvs(hi, 0, 0)
        for (const v of Object.values(ivs)) expect(v).toBe(15)
    })
    it("gros dépassement → chance de PARFAIT (rng min déclenche)", () => {
        const ivs = rollIvs(zero, 0, 1) // overshoot=1 → perfectChance 0.25 ; 0 < 0.25
        expect(ivTotal(ivs)).toBe(75)
        expect(ivTier(ivs)).toBe("PARFAIT")
    })
    it("bornes : tout IV reste dans [plancher, 15]", () => {
        let r = 0.123
        const rng = () => { r = (r * 9301 + 49297) % 233280 / 233280; return r }
        for (let i = 0; i < 200; i++) {
            const ivs = rollIvs(rng, 0.5, 0)
            for (const v of Object.values(ivs)) {
                expect(v).toBeGreaterThanOrEqual(0)
                expect(v).toBeLessThanOrEqual(15)
            }
        }
    })
    it("ivTier / ivTotal", () => {
        expect(ivTotal({ hp: 15, atk: 15, def: 15, spe: 15, spc: 15 })).toBe(75)
        expect(ivTier({ hp: 0, atk: 0, def: 0, spe: 0, spc: 0 })).toBe("D")
        expect(ivTier({ hp: 15, atk: 15, def: 15, spe: 15, spc: 15 })).toBe("PARFAIT")
    })
})
