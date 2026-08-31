import { describe, it, expect } from "vitest"
import { galijahTier, GALIJAH_TIER_LEVELS, GALIJAH_TIER_EVPCT } from "./playerStore"

// GALIJAH — paliers de repop indexés sur le nb d'ESPÈCES distinctes du Pokédex (150 → 200+).
describe("galijahTier", () => {
    it("−1 en dessous de 150 espèces", () => {
        expect(galijahTier(0)).toBe(-1)
        expect(galijahTier(149)).toBe(-1)
    })
    it("un palier tous les 10, de 150 à 200", () => {
        expect(galijahTier(150)).toBe(0) // niv 70
        expect(galijahTier(159)).toBe(0)
        expect(galijahTier(160)).toBe(1) // +10 niv
        expect(galijahTier(170)).toBe(2) // +20 niv
        expect(galijahTier(180)).toBe(3) // niv 100
        expect(galijahTier(190)).toBe(4) // niv 100 + 50 % EV
        expect(galijahTier(200)).toBe(5) // niv 100 + 100 % EV
    })
    it("plafonné à 5 au-delà de 200", () => {
        expect(galijahTier(250)).toBe(5)
        expect(galijahTier(999)).toBe(5)
    })
    it("les tables niveau/EV sont cohérentes (6 paliers, croissantes)", () => {
        expect(GALIJAH_TIER_LEVELS).toEqual([70, 80, 90, 100, 100, 100])
        expect(GALIJAH_TIER_EVPCT).toEqual([0, 0, 0, 0, 0.5, 1])
        expect(GALIJAH_TIER_LEVELS[galijahTier(180)]).toBe(100)
        expect(GALIJAH_TIER_EVPCT[galijahTier(200)]).toBe(1)
    })
})
