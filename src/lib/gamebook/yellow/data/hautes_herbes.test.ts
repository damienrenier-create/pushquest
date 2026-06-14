import { describe, it, expect } from "vitest"
import { rollWildEncounter, hasEncounters, speciesZones } from "./encounters"
import { getSpecies } from "./species"
import { Rng } from "../battle/rng"
import type { MonInstance } from "../battle/types"

const MAP = "yellow_hautes_herbes"
function rollMany(x: number, y: number, n: number, seed: number): MonInstance[] {
    const r = new Rng(seed)
    const rng = () => r.next()
    const out: MonInstance[] = []
    for (let i = 0; i < n; i++) {
        const m = rollWildEncounter({ mapId: MAP, x, y, leadLevel: 30, weakestTeamLevel: 20, strongestTeamLevel: 40, rng })
        if (m) out.push(m)
    }
    return out
}

describe("Hautes herbes — grille d'entraînement contrôlée", () => {
    it("zone reconnue + Goshendofy listé dans speciesZones", () => {
        expect(hasEncounters(MAP)).toBe(true)
        expect(speciesZones("goshendofy")).toContain(MAP)
    })

    it("NIVEAU déterministe par la ligne : band 0 (bas) = 3-6, band 4 (haut) = 15-18", () => {
        // Carré Plante (x=8). y=6 → band 0 ; y=2 → band 4. (On ignore Goshendofy, niv fixe 50.)
        const low = rollMany(8, 6, 400, 7).filter((m) => m.speciesId !== "goshendofy")
        const high = rollMany(8, 2, 400, 7).filter((m) => m.speciesId !== "goshendofy")
        expect(low.length).toBeGreaterThan(0)
        expect(high.length).toBeGreaterThan(0)
        for (const m of low) { expect(m.level).toBeGreaterThanOrEqual(3); expect(m.level).toBeLessThanOrEqual(6) }
        for (const m of high) { expect(m.level).toBeGreaterThanOrEqual(15); expect(m.level).toBeLessThanOrEqual(18) }
    })

    it("TYPE par carré : le carré Feu (x=17-20) ne sort que du Feu", () => {
        const feu = rollMany(18, 4, 400, 3).filter((m) => m.speciesId !== "goshendofy")
        expect(feu.length).toBeGreaterThan(0)
        for (const m of feu) expect(getSpecies(m.speciesId)?.types).toContain("FEU")
    })

    it("Goshendofy rôde en herbe basse : niv 50, Hyper Ball+ (≥5) + statut requis", () => {
        const seen = rollMany(8, 6, 40000, 99).find((m) => m.speciesId === "goshendofy")
        expect(seen, "Goshendofy jamais apparu en 40000 rolls band 0").toBeTruthy()
        expect(seen!.level).toBe(50)
        const cfg = seen as unknown as { captureMinBallBonus?: number; captureRequiresStatus?: boolean }
        expect(cfg.captureMinBallBonus).toBe(5)
        expect(cfg.captureRequiresStatus).toBe(true)
    })
})
