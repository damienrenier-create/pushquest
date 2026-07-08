import { describe, it, expect, beforeEach } from "vitest"
import { hydratePlayer } from "../store/playerStore"
import { hydratePokedex } from "../store/pokedexStore"
import { createMonInstance } from "../battle/factory"
import { emptyYellowStats } from "../storage/save"
import { visibleDexSpecies, SPECIES_IDS } from "../data/species"
import { computeRunScores, formatDuration } from "./runScore"

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const pts = (sc: ReturnType<typeof computeRunScores>, key: string) => sc.factors.find((f) => f.key === key)!.points

beforeEach(() => { hydratePokedex({ seen: [], caught: [] }) })

describe("runScore — stats brutes + note globale /1000 du run 2", () => {
    it("calcule les stats brutes + les 5 facteurs de la note globale", () => {
        const m1 = createMonInstance("morrow", 50, { owned: true })
        const m2 = createMonInstance("cerfeuillu", 40, { owned: true }); m2.shiny = true
        hydratePlayer({
            team: [m1, m2], reps: 4500, playtimeMs: 45_000, leaguePotions: 10,
            stats: { ...emptyYellowStats(), wins: 90, teamKos: 10, steps: 6000, energySpent: 4000 },
        })
        const caught = ["morrow", "cerfeuillu", "ukognos", "gekraise"]
        hydratePokedex({ seen: [], caught })
        const sc = computeRunScores()

        // --- stats brutes ---
        expect(sc.playtimeMs).toBe(45_000)
        expect(sc.energyConsumed).toBe(4000)
        expect(sc.steps).toBe(6000)

        // --- facteurs de la note /1000 ---
        const dexTotal = visibleDexSpecies(caught, true, true).length
        expect(pts(sc, "winrate")).toBe(Math.round((90 / 100) * 250))            // 90 V / 100 décisifs → 225
        expect(pts(sc, "species")).toBe(Math.round(clamp01(4 / dexTotal) * 200)) // 4 espèces / dex visible
        expect(pts(sc, "levels")).toBe(Math.round((90 / 600) * 150))            // Σ90 / 600 → 23
        expect(pts(sc, "frugality")).toBe(Math.round((1 - 4000 / 10000) * 200)) // 60% frugal → 120
        expect(pts(sc, "steps")).toBe(Math.round((1 - 6000 / 30000) * 200))     // 80% → 160

        // la note globale = somme exacte des points de chaque facteur (pas de round divergent)
        expect(sc.grade).toBe(sc.factors.reduce((s, f) => s + f.points, 0))
    })

    it("% de victoire = 100% (250 pts) si jamais mis KO", () => {
        hydratePlayer({ team: [], reps: 0, stats: { ...emptyYellowStats(), wins: 40, teamKos: 0 } })
        expect(pts(computeRunScores(), "winrate")).toBe(250)
    })

    it("frugalité : 0 pt si on a consommé ≥ 10000 énergie", () => {
        hydratePlayer({ team: [], reps: 0, stats: { ...emptyYellowStats(), energySpent: 13000 } })
        expect(pts(computeRunScores(), "frugality")).toBe(0)
    })

    it("peu de pas : 0 pt à partir de 30000 pas", () => {
        hydratePlayer({ team: [], reps: 0, stats: { ...emptyYellowStats(), steps: 31000 } })
        expect(pts(computeRunScores(), "steps")).toBe(0)
    })

    it("note plafonnée à 1000 quand tout est au maximum", () => {
        const team = Array.from({ length: 6 }, () => createMonInstance("morrow", 100, { owned: true }))
        hydratePlayer({ team, reps: 0, stats: { ...emptyYellowStats(), wins: 100, teamKos: 0, steps: 0, energySpent: 0 } })
        hydratePokedex({ seen: [], caught: [...SPECIES_IDS] }) // Pokédex complet
        expect(computeRunScores().grade).toBe(1000)
    })

    it("formatDuration : m:ss et h:mm:ss", () => {
        expect(formatDuration(90_000)).toBe("1:30")
        expect(formatDuration(3_661_000)).toBe("1:01:01")
    })
})
