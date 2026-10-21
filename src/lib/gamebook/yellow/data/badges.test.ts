import { describe, it, expect } from "vitest"
import { BADGES, ALL_BADGE_IDS, battleEnergyCap, BASE_BATTLE_ENERGY, BATTLE_ENERGY_PER_BADGE, getBadge } from "./badges"

describe("badges", () => {
    it("6 badges, dans l'ordre de jeu (le BATEAU = badge ANCRE en 4e depuis le 21/10/2026)", () => {
        expect(BADGES.map((b) => b.id)).toEqual(["plante", "roche", "feu", "ancre", "elec", "eau"])
        expect(ALL_BADGE_IDS).toEqual(BADGES.map((b) => b.id))
    })
    it("getBadge", () => {
        expect(getBadge("feu")?.emoji).toBe("🔥")
    })
    it("cap d'énergie monte avec les badges", () => {
        expect(battleEnergyCap(0)).toBe(BASE_BATTLE_ENERGY)
        expect(battleEnergyCap(3)).toBe(BASE_BATTLE_ENERGY + 3 * BATTLE_ENERGY_PER_BADGE)
        expect(battleEnergyCap(3)).toBeGreaterThan(battleEnergyCap(0))
    })
})
