import { describe, it, expect, beforeEach } from "vitest"
import { hydratePlayer } from "../store/playerStore"
import { hydratePokedex } from "../store/pokedexStore"
import { createMonInstance } from "../battle/factory"
import { emptyYellowStats } from "../storage/save"
import { visibleDexSpecies, SPECIES_IDS } from "../data/species"
import { computeRunScores, formatDuration } from "./runScore"
import { regradeRun2FromFactors } from "./runScoreCompute"

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const pts = (sc: ReturnType<typeof computeRunScores>, key: string) => sc.factors.find((f) => f.key === key)!.points

beforeEach(() => { hydratePokedex({ seen: [], caught: [] }) })

describe("runScore — stats brutes + note globale /1000 du run 2", () => {
    it("calcule les stats brutes + les 3 facteurs de PERFORMANCE (ni « pas » ni « frugalité » en run 2)", () => {
        const m1 = createMonInstance("morrow", 50, { owned: true })
        const m2 = createMonInstance("cerfeuillu", 40, { owned: true }); m2.shiny = true
        // Le Pokédex du SCORE = captures du RUN COURANT (caughtThisRun), PAS le pokédex global cumulatif.
        const caught = ["morrow", "cerfeuillu", "ukognos", "gekraise"]
        hydratePlayer({
            team: [m1, m2], reps: 4500, playtimeMs: 45_000, leaguePotions: 10, caughtThisRun: caught,
            stats: { ...emptyYellowStats(), wins: 90, teamKos: 10, steps: 6000, energySpent: 4000 },
        })
        hydratePokedex({ seen: [], caught }) // pokédex global (n'entre PLUS dans le score, gardé pour cohérence)
        const sc = computeRunScores()

        // --- stats brutes ---
        expect(sc.playtimeMs).toBe(45_000)
        expect(sc.energyConsumed).toBe(4000)
        expect(sc.steps).toBe(6000)

        // --- facteurs de la note /1000 ---
        const dexTotal = visibleDexSpecies(caught, true, true).length
        expect(pts(sc, "winrate")).toBe(Math.round((90 / 100) * 500))            // 90 V / 100 décisifs → 450
        expect(pts(sc, "species")).toBe(Math.round(clamp01(4 / dexTotal) * 400)) // 4 espèces / dex visible
        expect(pts(sc, "levels")).toBe(Math.round((90 / 600) * 100))            // Σ90 / 600 → 15
        expect(sc.factors.find((f) => f.key === "frugality")).toBeUndefined()    // frugalité RETIRÉE de la note run 2
        expect(sc.factors.find((f) => f.key === "steps")).toBeUndefined()        // le facteur « pas » n'existe plus en run 2

        // la note globale = somme exacte des points de chaque facteur (pas de round divergent)
        expect(sc.grade).toBe(sc.factors.reduce((s, f) => s + f.points, 0))
    })

    it("% de victoire = 100% (500 pts) si jamais mis KO", () => {
        hydratePlayer({ team: [], reps: 0, stats: { ...emptyYellowStats(), wins: 40, teamKos: 0 } })
        expect(pts(computeRunScores(), "winrate")).toBe(500)
    })

    it("l'énergie consommée n'entre PLUS dans le score du run 2 (frugalité retirée)", () => {
        // Même en ayant grillé énormément d'énergie, aucun facteur « frugality » n'apparaît ni ne pénalise.
        hydratePlayer({ team: [], reps: 0, stats: { ...emptyYellowStats(), energySpent: 13000 } })
        expect(computeRunScores().factors.find((f) => f.key === "frugality")).toBeUndefined()
    })

    it("le nombre de pas n'entre PLUS dans le score du run 2 (facteur retiré)", () => {
        // Même avec un nombre de pas énorme, aucun facteur « pas » n'apparaît (ni ne pénalise) en run 2.
        hydratePlayer({ team: [], reps: 0, stats: { ...emptyYellowStats(), steps: 31000 } })
        expect(computeRunScores().factors.find((f) => f.key === "steps")).toBeUndefined()
    })

    it("note plafonnée à 1000 quand tout est au maximum", () => {
        const team = Array.from({ length: 6 }, () => createMonInstance("morrow", 100, { owned: true }))
        hydratePlayer({ team, reps: 0, caughtThisRun: [...SPECIES_IDS], stats: { ...emptyYellowStats(), wins: 100, teamKos: 0, steps: 0, energySpent: 0 } })
        hydratePokedex({ seen: [], caught: [...SPECIES_IDS] }) // Pokédex complet (caughtThisRun = tout capturé CE run)
        expect(computeRunScores().grade).toBe(1000)
    })

    it("regradeRun2FromFactors : re-note un score figé sous les poids COURANTS, ignore frugality/steps", () => {
        // Facteurs ANCIENNE formule (le ratio [0,1] est indépendant de la formule) → re-notés 500/400/100.
        const oldFactors = [
            { key: "winrate", ratio: 0.9 }, { key: "species", ratio: 0.5 }, { key: "levels", ratio: 0.25 },
            { key: "frugality", ratio: 0.6 }, { key: "steps", ratio: 0.8 },
        ]
        expect(regradeRun2FromFactors(oldFactors)).toBe(675) // 0.9*500 + 0.5*400 + 0.25*100, frugality/steps ignorés
        expect(regradeRun2FromFactors(null)).toBeNull()
        expect(regradeRun2FromFactors([])).toBeNull()
        expect(regradeRun2FromFactors([{ key: "frugality", ratio: 0.9 }])).toBeNull() // aucun axe noté → null (garde r.score)
    })

    it("formatDuration : m:ss et h:mm:ss", () => {
        expect(formatDuration(90_000)).toBe("1:30")
        expect(formatDuration(3_661_000)).toBe("1:01:01")
    })
})
