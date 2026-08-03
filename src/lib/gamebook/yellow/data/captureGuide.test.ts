import { describe, it, expect } from "vitest"
import { captureGuide, runSpawnableSpecies } from "./encounters"

describe("captureGuide (Daemomaniaque) — scopé par run", () => {
    it("espèce sauvage commune, run 1 → au moins un lieu + des conseils", () => {
        const g = captureGuide("plumiot", 1) // commun Route Nord + Hautes Herbes (VOL)
        expect(g.where.length).toBeGreaterThan(0)
        expect(g.how.length).toBeGreaterThan(0)
        expect(g.where.join(" ")).toContain("📍")
    })

    it("espèce inconnue → note d'aide, aucun lieu", () => {
        const g = captureGuide("___inconnu___", 1)
        expect(g.where.length).toBe(0)
        expect(g.note).toBeTruthy()
    })

    it("hideEndgame ne crash pas + structure OK (goshendofy run 1 avant Ligue)", () => {
        const g = captureGuide("goshendofy", 1, true)
        expect(Array.isArray(g.where)).toBe(true)
        expect(Array.isArray(g.how)).toBe(true)
    })

    it("runSpawnableSpecies : chaque run a un ensemble non vide (et hideEndgame réduit le run 1)", () => {
        const s1 = runSpawnableSpecies(1)
        const s1Hidden = runSpawnableSpecies(1, true)
        const s2 = runSpawnableSpecies(2)
        const s3 = runSpawnableSpecies(3)
        expect(s1.size).toBeGreaterThan(0)
        expect(s2.size).toBeGreaterThan(0)
        expect(s3.size).toBeGreaterThan(0)
        expect(s1Hidden.size).toBeLessThanOrEqual(s1.size) // masquer l'endgame ne peut qu'enlever des espèces
    })
})
