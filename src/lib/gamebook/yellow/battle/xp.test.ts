import { describe, it, expect } from "vitest"
import { expForLevel, levelFromExp, xpToNextLevel, xpForDefeat, applyExp, MAX_LEVEL } from "./xp"
import type { MonInstance } from "./types"

describe("courbe d'XP (16·L² + paliers cubiques)", () => {
    it("expForLevel : niveau 1 = 0, croît avec des paliers", () => {
        expect(expForLevel(1)).toBe(0)
        expect(expForLevel(10)).toBe(1685)
        expect(expForLevel(50)).toBe(100_810)
        expect(expForLevel(100)).toBe(833_315)
    })
    it("la difficulté par niveau CROÎT (paliers de plus en plus durs)", () => {
        expect(xpToNextLevel(40)).toBeGreaterThan(xpToNextLevel(10))
        expect(xpToNextLevel(10)).toBeGreaterThan(xpToNextLevel(5))
    })
    it("levelFromExp est l'inverse (palier inférieur)", () => {
        expect(levelFromExp(expForLevel(10))).toBe(10)
        expect(levelFromExp(expForLevel(10) - 1)).toBe(9)
        expect(levelFromExp(0)).toBe(1)
    })
    it("ne dépasse jamais MAX_LEVEL", () => {
        expect(levelFromExp(999_999_999)).toBe(MAX_LEVEL)
    })
})

describe("xpForDefeat", () => {
    it("sauvage = floor(baseExp*level/5)", () => {
        // 30 * 10 / 5 = 60.
        expect(xpForDefeat(30, 10, true)).toBe(60)
    })
    it("dresseur = ×1.5", () => {
        expect(xpForDefeat(30, 10, false)).toBe(90) // floor(60*1.5)
    })
    it("toujours >= 1", () => {
        expect(xpForDefeat(1, 1, true)).toBe(1)
    })
})

function makeMon(level: number, exp: number): MonInstance {
    return {
        uid: "test", speciesId: "cornaissant", level, exp,
        ivs: { hp: 0, atk: 0, def: 0, spe: 0, spc: 0 },
        currentHp: 20, status: "NONE", statusCounter: 0,
        moves: [{ moveId: "charge", pp: 35, ppMax: 35 }],
    }
}

describe("applyExp (montée de niveau + apprentissage)", () => {
    it("monte de niveau et apprend les attaques du learnset", () => {
        // Cornaissant niv 1 → assez d'XP pour atteindre le niveau 6.
        const mon = makeMon(1, expForLevel(1))
        const r = applyExp(mon, expForLevel(6) - expForLevel(1))
        expect(mon.level).toBe(6)
        expect(r.fromLevel).toBe(1)
        expect(r.toLevel).toBe(6)
        // picpic s'apprend au niveau 5.
        expect(mon.moves.some((m) => m.moveId === "picpic")).toBe(true)
        expect(r.learnedMoveIds).toContain("picpic")
    })
    it("4 slots pleins → les attaques sont MISES EN ATTENTE (pas perdues)", () => {
        const mon = makeMon(1, expForLevel(1))
        mon.moves = [
            { moveId: "a", pp: 5, ppMax: 5 }, { moveId: "b", pp: 5, ppMax: 5 },
            { moveId: "c", pp: 5, ppMax: 5 }, { moveId: "d", pp: 5, ppMax: 5 },
        ]
        const r = applyExp(mon, expForLevel(20)) // Cornaissant : picpic(L5) + dard_venin(L14)
        expect(mon.moves.length).toBe(4)               // toujours 4 slots
        expect(r.pendingMoveIds).toContain("picpic")   // proposées, pas ignorées
        expect(mon.pendingMoves).toContain("dard_venin")
    })
    it("ne fait jamais baisser le niveau", () => {
        const mon = makeMon(10, expForLevel(10))
        const r = applyExp(mon, 0)
        expect(mon.level).toBe(10)
        expect(r.toLevel).toBe(10)
    })
})
