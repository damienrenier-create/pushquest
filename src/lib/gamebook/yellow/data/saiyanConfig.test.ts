import { describe, it, expect } from "vitest"
import { allocatedBonus, SAIYAN_POINT_VALUE, SAIYAN_POINTS_PER_LEVEL } from "./saiyanConfig"
import { fullStats } from "../battle/stats"
import { applyExp, expForLevel } from "../battle/xp"
import { getSpecies } from "./species"
import type { MonInstance } from "../battle/types"

function mon(level: number, exp: number, allocated?: MonInstance["allocated"]): MonInstance {
    return {
        uid: "t", speciesId: "feuillichot", level, exp,
        ivs: { hp: 0, atk: 0, def: 0, spe: 0, spc: 0 },
        currentHp: 20, status: "NONE", statusCounter: 0,
        moves: [{ moveId: "charge", pp: 35, ppMax: 35 }],
        allocated,
    }
}

describe("Saiyan — couche additive de stats", () => {
    const sp = getSpecies("feuillichot")!

    it("0 point alloué = stats Gen-1 d'origine (aucun changement)", () => {
        const base = fullStats(mon(20, expForLevel(20)), sp)
        const baseNoAlloc = fullStats({ level: 20, ivs: { hp: 0, atk: 0, def: 0, spe: 0, spc: 0 } }, sp)
        expect(base.atk).toBe(baseNoAlloc.atk)
    })

    it("points alloués = bonus à plat additif", () => {
        const before = fullStats(mon(20, expForLevel(20)), sp)
        const after = fullStats(mon(20, expForLevel(20), { atk: 5 }), sp)
        expect(after.atk).toBe(before.atk + 5 * SAIYAN_POINT_VALUE.atk)
    })

    it("les PV scalent plus gros par point", () => {
        expect(allocatedBonus("hp", 3)).toBe(3 * SAIYAN_POINT_VALUE.hp)
        expect(SAIYAN_POINT_VALUE.hp).toBeGreaterThan(SAIYAN_POINT_VALUE.atk)
    })

    it("monter de niveau accorde des points Saiyan", () => {
        const m = mon(1, expForLevel(1))
        const r = applyExp(m, expForLevel(6) - expForLevel(1)) // niv 1 → 6
        expect(m.statPoints).toBe((r.toLevel - r.fromLevel) * SAIYAN_POINTS_PER_LEVEL)
        expect(m.statPoints).toBeGreaterThan(0)
    })
})
