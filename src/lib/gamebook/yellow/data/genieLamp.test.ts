import { describe, it, expect } from "vitest"
import {
    rollLampCountdown, teamHpRatio, teamFreshEnough, genieTrainerLevel, genieTrainerDelta, genieArcEnabledFor, genieArcImmediate,
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

    it("genieTrainerDelta : écart échelonné selon le niveau", () => {
        expect(genieTrainerDelta(15)).toBe(2) // <20
        expect(genieTrainerDelta(30)).toBe(3) // <40
        expect(genieTrainerDelta(50)).toBe(4) // <60
        expect(genieTrainerDelta(70)).toBe(5) // <80
        expect(genieTrainerDelta(90)).toBe(6) // 80+
    })

    it("genieTrainerLevel : moyenne d'équipe − écart échelonné, avec plancher", () => {
        expect(genieTrainerLevel(15)).toBe(13) // 15 - 2
        expect(genieTrainerLevel(30)).toBe(27) // 30 - 3
        expect(genieTrainerLevel(50)).toBe(46) // 50 - 4
        expect(genieTrainerLevel(70)).toBe(65) // 70 - 5
        expect(genieTrainerLevel(90)).toBe(84) // 90 - 6
        expect(genieTrainerLevel(4)).toBe(GENIE_TRAINER_LEVEL_MIN) // 4-2=2 < plancher 3
    })

    it("genieArcImmediate : true en phase de test (GENIE_ARC_ALL=false)", () => {
        expect(genieArcImmediate()).toBe(true) // tant que l'arc n'est pas ouvert à tous
    })

    it("genieArcEnabledFor : liste blanche (Mools) tant que GENIE_ARC_ALL=false", () => {
        expect(genieArcEnabledFor("mools")).toBe(true)
        expect(genieArcEnabledFor("Mools")).toBe(true)   // insensible à la casse
        expect(genieArcEnabledFor("  MOOLS ")).toBe(true) // trim
        expect(genieArcEnabledFor("frans")).toBe(false)
        expect(genieArcEnabledFor(undefined)).toBe(false)
        expect(genieArcEnabledFor(null)).toBe(false)
    })
})
