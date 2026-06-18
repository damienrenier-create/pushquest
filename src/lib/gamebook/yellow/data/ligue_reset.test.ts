import { describe, it, expect } from "vitest"
import { hydratePlayer, isTrainerDefeated, resetLigueProgress } from "../store/playerStore"

describe("Ligue — restart au K.O. (resetLigueProgress)", () => {
    it("oublie toutes les victoires y_ligue_* mais conserve les autres dresseurs", () => {
        hydratePlayer({ defeatedTrainers: ["y_ligue_1_olga", "y_ligue_2_aldo", "y_ligue_3_agatha", "y_trainer_leo"] })
        resetLigueProgress()
        expect(isTrainerDefeated("y_ligue_1_olga")).toBe(false)
        expect(isTrainerDefeated("y_ligue_2_aldo")).toBe(false)
        expect(isTrainerDefeated("y_ligue_3_agatha")).toBe(false)
        expect(isTrainerDefeated("y_trainer_leo")).toBe(true) // dresseur hors Ligue : conservé
    })

    it("no-op si aucune victoire de Ligue", () => {
        hydratePlayer({ defeatedTrainers: ["y_trainer_leo"] })
        resetLigueProgress()
        expect(isTrainerDefeated("y_trainer_leo")).toBe(true)
    })
})
