import { describe, it, expect } from "vitest"
import { BADGES, battleEnergyCap, BASE_BATTLE_ENERGY, BATTLE_ENERGY_PER_BADGE, getBadge } from "./badges"

describe("badges", () => {
    it("4 badges (feu/plante/eau/elec)", () => {
        expect(BADGES.map((b) => b.id).sort()).toEqual(["eau", "elec", "feu", "plante"])
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
