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

    it("taux de pop affiché en % (et non plus en bande de rareté)", () => {
        const g = captureGuide("plumiot", 1)
        expect(g.where.join(" ")).toMatch(/≈[\d.]+%/) // ex. « ≈16% »
    })

    it("pyropanthe (évo pierre) → obtention spéciale : conseils + note, pas de « introuvable »", () => {
        const g = captureGuide("pyropanthe", 1)
        expect(g.how.length).toBeGreaterThan(0)
        expect(g.note).toBeTruthy()
        expect(g.how.join(" ")).toMatch(/Pierre Gékroc/)
    })

    it("magnetor (évo Noyau de Métal) → obtention spéciale décrite", () => {
        const g = captureGuide("magnetor", 3)
        expect(g.how.join(" ")).toMatch(/Noyau de Métal/)
    })

    it("geckebre → obtention boutique Jetons (voie unique)", () => {
        const g = captureGuide("geckebre", 3)
        expect(g.how.join(" ")).toMatch(/Jetons/)
    })

    it("phoechaudi capturable à l'état sauvage en run 3 (Grotte)", () => {
        const g = captureGuide("phoechaudi", 3)
        expect(g.where.length).toBeGreaterThan(0)
    })

    it("supabatchu (évo de batchu sauvage) → repli pré-évolué avec lieu", () => {
        const g = captureGuide("supabatchu", 1)
        expect(g.where.length).toBeGreaterThan(0) // hérite du lieu de batchu
        expect(g.note).toMatch(/évoluer/)
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
