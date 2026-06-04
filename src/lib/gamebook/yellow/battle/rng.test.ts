import { describe, it, expect } from "vitest"
import { Rng, makeSeed } from "./rng"

describe("Rng (Mulberry32 déterministe)", () => {
    it("produit la même séquence pour une même seed", () => {
        const a = new Rng(12345)
        const b = new Rng(12345)
        const seqA = Array.from({ length: 10 }, () => a.next())
        const seqB = Array.from({ length: 10 }, () => b.next())
        expect(seqA).toEqual(seqB)
    })

    it("produit des séquences différentes pour des seeds différentes", () => {
        const a = Array.from({ length: 5 }, ((r) => () => r.next())(new Rng(1)))
        const b = Array.from({ length: 5 }, ((r) => () => r.next())(new Rng(2)))
        expect(a).not.toEqual(b)
    })

    it("next() reste dans [0, 1)", () => {
        const r = new Rng(987654321)
        for (let i = 0; i < 1000; i++) {
            const v = r.next()
            expect(v).toBeGreaterThanOrEqual(0)
            expect(v).toBeLessThan(1)
        }
    })

    it("int(min, max) reste dans les bornes inclusives", () => {
        const r = new Rng(555)
        for (let i = 0; i < 1000; i++) {
            const v = r.int(3, 7)
            expect(v).toBeGreaterThanOrEqual(3)
            expect(v).toBeLessThanOrEqual(7)
            expect(Number.isInteger(v)).toBe(true)
        }
    })

    it("chance(0) toujours faux, chance(100) toujours vrai", () => {
        const r = new Rng(1)
        for (let i = 0; i < 50; i++) {
            expect(r.chance(0)).toBe(false)
            expect(r.chance(100)).toBe(true)
        }
    })

    it("damageFactor() est dans 0.85..1.00", () => {
        const r = new Rng(42)
        for (let i = 0; i < 1000; i++) {
            const f = r.damageFactor()
            expect(f).toBeGreaterThanOrEqual(0.85)
            expect(f).toBeLessThanOrEqual(1)
        }
    })

    it("getState() reflète l'avancée du générateur", () => {
        const r = new Rng(7)
        const s0 = r.getState()
        r.next()
        expect(r.getState()).not.toBe(s0)
    })

    it("makeSeed est stable et indépendant de l'ordre des bits", () => {
        expect(makeSeed(1, 2, 3)).toBe(makeSeed(1, 2, 3))
        expect(makeSeed(1, 2)).not.toBe(makeSeed(2, 1))
    })
})
