import { describe, it, expect } from "vitest"
import { buildSbireTeam, sbireExplanation, SBIRE_MAX_FIGHTS_PER_DAY, SBIRE_EXPLANATIONS } from "./sbire"
import { createMonInstance } from "../battle/factory"
import { getSpecies } from "./species"
import { typeEffectiveness } from "../battle/typeChart"

describe("sbire du dieu Spaghetti", () => {
    it("1er combat (index 0) = MIROIR du lead : même espèce, même niveau", () => {
        const lead = createMonInstance("feuillichot", 12)
        const team = buildSbireTeam(lead, 0)
        expect(team).toHaveLength(1)
        expect(team[0].speciesId).toBe(lead.speciesId)
        expect(team[0].level).toBe(12)
    })

    it("2e combat (index 1) = FAIBLESSE du lead, à niveau équivalent", () => {
        const lead = createMonInstance("feuillichot", 20) // PLANTE pur → faiblesse claire
        const team = buildSbireTeam(lead, 1)
        expect(team).toHaveLength(1)
        expect(team[0].level).toBe(20)
        const leadTypes = getSpecies(lead.speciesId)!.types
        const counterTypes = getSpecies(team[0].speciesId)!.types
        const superEff = counterTypes.some((t) => typeEffectiveness(t, leadTypes) > 1)
        expect(superEff).toBe(true)
    })

    it("les explications sont 1-indexées et cyclent sur le pool", () => {
        expect(sbireExplanation(1)).toBe(SBIRE_EXPLANATIONS[0])
        expect(sbireExplanation(SBIRE_EXPLANATIONS.length)).toBe(SBIRE_EXPLANATIONS[SBIRE_EXPLANATIONS.length - 1])
        expect(sbireExplanation(SBIRE_EXPLANATIONS.length + 1)).toBe(SBIRE_EXPLANATIONS[0])
    })

    it("plafonne à 2 combats par jour", () => {
        expect(SBIRE_MAX_FIGHTS_PER_DAY).toBe(2)
    })
})
