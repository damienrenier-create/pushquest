import { describe, it, expect } from "vitest"
import {
    rollLampCountdown, teamHpRatio, teamFreshEnough, genieTrainerLevel,
    LAMP_CD_MIN, LAMP_CD_MAX, LAMP_HP_MIN_RATIO, GENIE_TRAINER_LEVEL_MIN,
} from "./genieLamp"

describe("Arc Lampe & Génie — helpers purs", () => {
    it("rollLampCountdown reste dans [MIN, MAX] aux bornes de rng", () => {
        expect(rollLampCountdown(() => 0)).toBe(LAMP_CD_MIN)
        expect(rollLampCountdown(() => 0.9999)).toBe(LAMP_CD_MAX)
        for (let r = 0; r < 1; r += 0.017) {
            const n = rollLampCountdown(() => r)
            expect(n).toBeGreaterThanOrEqual(LAMP_CD_MIN)
            expect(n).toBeLessThanOrEqual(LAMP_CD_MAX)
        }
    })

    it("teamHpRatio = Σ courants / Σ max ; 0 si vide ou max nul", () => {
        expect(teamHpRatio([])).toBe(0)
        expect(teamHpRatio([{ hp: 0, maxHp: 0 }])).toBe(0)
        expect(teamHpRatio([{ hp: 50, maxHp: 100 }])).toBeCloseTo(0.5)
        expect(teamHpRatio([{ hp: 30, maxHp: 30 }, { hp: 0, maxHp: 30 }])).toBeCloseTo(0.5)
        expect(teamHpRatio([{ hp: -5, maxHp: 100 }])).toBe(0) // PV négatifs clampés
    })

    it("teamFreshEnough : strictement au-dessus du seuil", () => {
        expect(teamFreshEnough([{ hp: 100, maxHp: 100 }])).toBe(true)   // 100%
        expect(teamFreshEnough([{ hp: 91, maxHp: 100 }])).toBe(true)    // 91% > 90%
        expect(teamFreshEnough([{ hp: 90, maxHp: 100 }])).toBe(false)   // pile 90% → non
        expect(teamFreshEnough([{ hp: 50, maxHp: 100 }])).toBe(false)
        expect(LAMP_HP_MIN_RATIO).toBe(0.9)
    })

    it("genieTrainerLevel : plusieurs crans sous le lead, avec plancher", () => {
        expect(genieTrainerLevel(30)).toBe(26)                     // 30 - 4
        expect(genieTrainerLevel(5)).toBe(GENIE_TRAINER_LEVEL_MIN) // plancher (5-4=1 < 3)
        expect(genieTrainerLevel(GENIE_TRAINER_LEVEL_MIN)).toBe(GENIE_TRAINER_LEVEL_MIN)
    })
})
