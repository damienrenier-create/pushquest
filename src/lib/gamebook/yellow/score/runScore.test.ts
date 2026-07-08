import { describe, it, expect, beforeEach } from "vitest"
import { hydratePlayer } from "../store/playerStore"
import { hydratePokedex } from "../store/pokedexStore"
import { createMonInstance } from "../battle/factory"
import { emptyYellowStats } from "../storage/save"
import { computeRunScores, formatDuration } from "./runScore"

beforeEach(() => { hydratePokedex({ seen: [], caught: [] }) })

describe("runScore — 5 scores du run 2", () => {
    it("calcule les 5 scores selon la spec", () => {
        const started = 1_000_000
        const now = started + 90_000 // 90 s écoulées
        const m1 = createMonInstance("morrow", 50, { owned: true })
        const m2 = createMonInstance("cerfeuillu", 40, { owned: true }); m2.shiny = true
        hydratePlayer({
            team: [m1, m2], reps: 4500, ngplusStartedAt: started, playtimeMs: 45_000, leaguePotions: 10,
            stats: { ...emptyYellowStats(), teamKos: 2, steps: 1234 },
        })
        hydratePokedex({ seen: [], caught: ["morrow", "cerfeuillu", "ukognos", "gekraise"] }) // 4 espèces, 2 inédites (ukognos+gekraise)
        const sc = computeRunScores(now)

        expect(sc.realTimeMs).toBe(90_000)
        expect(sc.playtimeMs).toBe(45_000)
        expect(sc.frugality).toBe(5500) // 10000 − 4500
        expect(sc.steps).toBe(1234)
        // maîtrise : GAINS Σniv 90 + 25×4 + 100×1(shiny) + 200×2(inédits) = 690, × 0.99^10 (potions) × 0.98^2 (2 défaites)
        const base = 90 + 25 * 4 + 100 * 1 + 200 * 2
        expect(sc.mastery).toBe(Math.round(base * Math.pow(0.99, 10) * Math.pow(0.98, 2)))
    })

    it("frugalité bornée [0,10000] : reps ≥ 10000 → 0", () => {
        hydratePlayer({ team: [], reps: 12000, leaguePotions: 0, stats: { ...emptyYellowStats() } })
        expect(computeRunScores().frugality).toBe(0)
    })

    it("maîtrise : défaites = malus MULTIPLICATIF borné (jamais 0 ni négative, même à 100 défaites)", () => {
        hydratePlayer({ team: [createMonInstance("morrow", 50, { owned: true })], reps: 0, leaguePotions: 0, stats: { ...emptyYellowStats(), teamKos: 100 } })
        hydratePokedex({ seen: [], caught: ["morrow"] })
        const base = 50 + 25 * 1 // Σniv 50 + 1 espèce distincte
        const sc = computeRunScores()
        expect(sc.mastery).toBeGreaterThan(0)   // fini le −50 fixe qui écrasait le score à 0
        expect(sc.mastery).toBeLessThan(base)   // les défaites grignotent quand même (borné)
        expect(sc.mastery).toBe(Math.round(base * Math.pow(0.98, 100)))
    })

    it("temps réel = 0 si le NG+ n'a pas encore été lancé (ngplusStartedAt undefined)", () => {
        hydratePlayer({ team: [], reps: 0, ngplusStartedAt: undefined, stats: { ...emptyYellowStats() } })
        expect(computeRunScores().realTimeMs).toBe(0)
    })

    it("formatDuration : m:ss et h:mm:ss", () => {
        expect(formatDuration(90_000)).toBe("1:30")
        expect(formatDuration(3_661_000)).toBe("1:01:01")
    })
})
