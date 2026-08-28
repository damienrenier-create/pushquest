import { describe, it, expect } from "vitest"
import { funRollIvs, FUN_GROUP_EXCELLENT_PER_PLAYER, FUN_GROUP_EXCELLENT_CAP } from "./ivConfig"
import { playerAttackQuota, QUOTA_STD } from "./combatCostConfig"
import { funCaptureFactor } from "./captureConfig"

// Générateur déterministe : rejoue une séquence de valeurs (bouclée) pour piloter funRollIvs.
function seqRng(values: number[]): () => number {
    let i = 0
    return () => values[i++ % values.length]
}

describe("MODE FUN — coût d'attaque par badges (playerAttackQuota)", () => {
    it("barème 0→30 · 1→50 · 2→90 · 3→120 · 4→150", () => {
        expect(playerAttackQuota(0)).toBe(30)
        expect(playerAttackQuota(1)).toBe(50)
        expect(playerAttackQuota(2)).toBe(90)
        expect(playerAttackQuota(3)).toBe(120)
        expect(playerAttackQuota(4)).toBe(150)
    })
    it("5+ badges = 150 (JAMAIS au-delà du plafond QUOTA_STD)", () => {
        expect(playerAttackQuota(5)).toBe(150)
        expect(playerAttackQuota(9)).toBe(150)
        expect(playerAttackQuota(100)).toBe(QUOTA_STD)
        expect(playerAttackQuota(5)).toBeLessThanOrEqual(QUOTA_STD)
    })
    it("valeurs aberrantes bornées", () => {
        expect(playerAttackQuota(-3)).toBe(30)
        expect(playerAttackQuota(2.9)).toBe(90) // floor
    })
})

describe("MODE FUN — capture sans quota, modulée par les IV (funCaptureFactor)", () => {
    it("0 IV = neutre (1), 15 IV = 0.6, jamais > 1", () => {
        expect(funCaptureFactor(0)).toBeCloseTo(1)
        expect(funCaptureFactor(15)).toBeCloseTo(0.6)
        expect(funCaptureFactor(7.5)).toBeCloseTo(0.8)
        expect(funCaptureFactor(15)).toBeLessThan(funCaptureFactor(0))
    })
    it("borne les entrées hors [0,15]", () => {
        expect(funCaptureFactor(-5)).toBeCloseTo(1)
        expect(funCaptureFactor(99)).toBeCloseTo(0.6)
    })
})

describe("MODE FUN — IV à paliers (funRollIvs)", () => {
    it("tous les IV restent dans [0,15] (1000 tirages aléatoires)", () => {
        for (let n = 0; n < 1000; n++) {
            const ivs = funRollIvs(Math.random, Math.floor(Math.random() * 30))
            for (const k of ["hp", "atk", "def", "spe", "spc"] as const) {
                expect(ivs[k]).toBeGreaterThanOrEqual(0)
                expect(ivs[k]).toBeLessThanOrEqual(15)
            }
        }
    })
    it("palier MOYEN (u<0.60) = 6..9 quand personne en ligne", () => {
        // rng renvoie toujours 0 → u=0, bonus=0 → branche MOYEN, 6 + floor(0*4) = 6
        expect(funRollIvs(seqRng([0]), 0)).toEqual({ hp: 6, atk: 6, def: 6, spe: 6, spc: 6 })
    })
    it("bonus de GROUPE : u<bonus → IV EXCELLENT (12..15)", () => {
        // connectedCount=10 → bonus = min(0.20, 0.02*10) = 0.20 ; u=0 < 0.20 → EXCELLENT, 12 + floor(0*4) = 12
        expect(funRollIvs(seqRng([0]), 10)).toEqual({ hp: 12, atk: 12, def: 12, spe: 12, spc: 12 })
        // sans personne en ligne, la même séquence donne le palier moyen (pas de bonus)
        expect(funRollIvs(seqRng([0]), 0).hp).toBe(6)
    })
    it("le bonus de groupe est plafonné (+2%/joueur, cap +20%)", () => {
        expect(FUN_GROUP_EXCELLENT_PER_PLAYER).toBe(0.02)
        expect(FUN_GROUP_EXCELLENT_CAP).toBe(0.20)
        // 20 joueurs → bonus atteint le cap (0.40 théorique borné à 0.20) : u=0.30 reste dans le MOYEN
        // (0.20 ≤ 0.30 < 0.60) → pas excellent au-delà du cap.
        expect(funRollIvs(seqRng([0.3]), 20).hp).toBeGreaterThanOrEqual(6)
        expect(funRollIvs(seqRng([0.3]), 20).hp).toBeLessThanOrEqual(9)
    })
    it("extrêmes (u≥0.95) = 0 ou 15", () => {
        // u=0.99 (dernier palier), puis rng=0.99 → 0.99<0.5 faux → 15
        expect(funRollIvs(seqRng([0.99, 0.99]), 0)).toEqual({ hp: 15, atk: 15, def: 15, spe: 15, spc: 15 })
        // u=0.99, puis rng=0 → 0<0.5 vrai → 0
        expect(funRollIvs(seqRng([0.99, 0]), 0)).toEqual({ hp: 0, atk: 0, def: 0, spe: 0, spc: 0 })
    })
})
