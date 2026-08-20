import { describe, it, expect } from "vitest"
import { DOME_TIERS, DAN_TIERS, DOME_ONLY_TIERS, isDanTier } from "./domeTypes"

// Le Gardien du Dôme gère DOME_ONLY_TIERS (Bronze→Maître) ; le Gardien des Dan gère DAN_TIERS (DAN_1..4).
describe("Dôme — split des tiers entre les 2 gardiens", () => {
    it("DOME_ONLY_TIERS + DAN_TIERS partitionnent DOME_TIERS (sans doublon, sans trou, dans l'ordre)", () => {
        expect([...DOME_ONLY_TIERS, ...DAN_TIERS]).toEqual([...DOME_TIERS])
    })
    it("DOME_ONLY_TIERS ne contient AUCUN dan et finit à Maître", () => {
        for (const t of DOME_ONLY_TIERS) expect(isDanTier(t)).toBe(false)
        expect(DOME_ONLY_TIERS[DOME_ONLY_TIERS.length - 1]).toBe("MAITRE")
    })
    it("DAN_TIERS = les 4 dans uniquement", () => {
        expect(DAN_TIERS.length).toBe(4)
        for (const t of DAN_TIERS) expect(isDanTier(t)).toBe(true)
    })
})
