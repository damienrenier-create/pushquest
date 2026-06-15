import { describe, it, expect } from "vitest"
import { rollWildEncounter, hasEncounters, speciesZones, hautesHerbesTypesForDay } from "./encounters"
import { getSpecies } from "./species"
import { Rng } from "../battle/rng"
import type { MonInstance } from "../battle/types"

const MAP = "yellow_hautes_herbes"
const DAY = "2026-06-15"
function rollMany(x: number, y: number, n: number, seed: number, dayKey = DAY): MonInstance[] {
    const r = new Rng(seed)
    const rng = () => r.next()
    const out: MonInstance[] = []
    for (let i = 0; i < n; i++) {
        const m = rollWildEncounter({ mapId: MAP, x, y, leadLevel: 30, weakestTeamLevel: 20, strongestTeamLevel: 40, rng, dayKey })
        if (m) out.push(m)
    }
    return out
}
const wild = (m: MonInstance) => m.speciesId !== "goshendofy"

// Colonnes des 3 paliers (cf. ZONES.yellow_hautes_herbes) : P1=[2,6] P2=[11,15] P3=[20,24].
describe("Hautes herbes — 3 paliers + rotation quotidienne par type", () => {
    it("zone reconnue + Goshendofy listé dans speciesZones", () => {
        expect(hasEncounters(MAP)).toBe(true)
        expect(speciesZones("goshendofy")).toContain(MAP)
    })

    it("NIVEAU déterministe par PALIER × BANDE", () => {
        const inRange = (ms: MonInstance[], lo: number, hi: number) => {
            expect(ms.length).toBeGreaterThan(0)
            for (const m of ms) { expect(m.level).toBeGreaterThanOrEqual(lo); expect(m.level).toBeLessThanOrEqual(hi) }
        }
        inRange(rollMany(4, 6, 300, 7).filter(wild), 3, 6)    // P1 band0
        inRange(rollMany(4, 2, 300, 7).filter(wild), 15, 18)  // P1 band4
        inRange(rollMany(13, 6, 300, 7).filter(wild), 18, 22) // P2 band0
        inRange(rollMany(13, 2, 300, 7).filter(wild), 34, 38) // P2 band4
        inRange(rollMany(22, 6, 300, 7).filter(wild), 38, 41) // P3 band0
        inRange(rollMany(22, 2, 300, 7).filter(wild), 50, 50) // P3 band4 → 50
    })

    it("ROTATION : 3 types distincts/jour, jamais ROCHE au palier 1", () => {
        for (const d of ["2026-06-15", "2026-06-16", "2026-06-17", "2026-01-01", "2025-12-31", "2027-03-09"]) {
            const t = hautesHerbesTypesForDay(d)
            expect(t).toHaveLength(3)
            expect(new Set(t).size).toBe(3) // distincts
            expect(t[0]).not.toBe("ROCHE") // palier 1 jamais Roche (highOnlyTypes)
        }
    })

    it("TYPE par carré = le type du JOUR pour ce palier (formes évoluées comprises)", () => {
        const [t1, t2, t3] = hautesHerbesTypesForDay(DAY)
        for (const m of rollMany(4, 6, 400, 3).filter(wild)) expect(getSpecies(m.speciesId)?.types).toContain(t1)
        for (const m of rollMany(13, 6, 400, 3).filter(wild)) expect(getSpecies(m.speciesId)?.types).toContain(t2)
        for (const m of rollMany(22, 6, 400, 3).filter(wild)) expect(getSpecies(m.speciesId)?.types).toContain(t3)
    })

    it("le TYPE change d'un jour à l'autre (au moins un palier diffère)", () => {
        const a = hautesHerbesTypesForDay("2026-06-15")
        const b = hautesHerbesTypesForDay("2026-06-16")
        expect(a.join() !== b.join()).toBe(true)
    })

    it("Goshendofy rôde en herbe basse (palier 1, band 0) : niv 50, Hyper Ball+ (≥5) + statut", () => {
        const seen = rollMany(4, 6, 40000, 99).find((m) => m.speciesId === "goshendofy")
        expect(seen, "Goshendofy jamais apparu en 40000 rolls P1 band0").toBeTruthy()
        expect(seen!.level).toBe(50)
        const cfg = seen as unknown as { captureMinBallBonus?: number; captureRequiresStatus?: boolean }
        expect(cfg.captureMinBallBonus).toBe(5)
        expect(cfg.captureRequiresStatus).toBe(true)
    })

    it("allée (herbe basse entre carrés) = aucune rencontre", () => {
        expect(rollMany(8, 4, 500, 5).length).toBe(0)  // x=8 dans le gap [7,10]
        expect(rollMany(18, 4, 500, 5).length).toBe(0) // x=18 dans le gap [16,19]
    })
})
