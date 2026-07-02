import { describe, it, expect } from "vitest"
import { talentEffect, talentOutgoingDmgMult, talentIncomingDmgMult, talentSpeedMult, TALENT_EFFECTS } from "./talentEffects"
import { registerCustomSpecies } from "../data/species"
import { buildCustomSpecies, suggestLearnset, TALENT_KEYS, type CustomSpec } from "../create/customSpecies"

function specWith(talent: string): CustomSpec {
    return {
        name: `Tal_${talent}`, da: "x", character: "y", stages: 3, bloomer: "mid", curve: "linear", role: "equilibre",
        finalTypes: ["FEU"], finalStats: { hp: 90, atk: 100, def: 80, spe: 95, spc: 70 },
        learnset: suggestLearnset(["FEU"]), secretTalent: talent as CustomSpec["secretTalent"],
    }
}
function idWithTalent(talent: string): string {
    const chain = buildCustomSpecies(specWith(talent), "tal")
    registerCustomSpecies(chain)
    return chain[0].id
}

describe("talents — module d'effets", () => {
    it("chaque clé de talent (roster) a un effet non vide", () => {
        for (const k of TALENT_KEYS) {
            expect(TALENT_EFFECTS[k], `effet manquant pour ${k}`).toBeTruthy()
            expect(Object.keys(TALENT_EFFECTS[k]).length).toBeGreaterThan(0)
        }
    })

    it("espèce STANDARD (sans talent) → strictement NEUTRE (combat existant inchangé)", () => {
        const std = { speciesId: "braisille" }
        expect(talentEffect(std)).toBeUndefined()
        expect(talentSpeedMult(std)).toBe(1)
        expect(talentOutgoingDmgMult(std, { stab: true, typeEff: 2, isCrit: true, moveType: "FEU", mainType: "FEU", targetHpFrac: 0.1 })).toBe(1)
        expect(talentIncomingDmgMult(std, { typeEff: 2, isPhysical: true })).toBe(1)
    })

    it("Zèle élémentaire : +5 % SEULEMENT quand STAB", () => {
        const m = { speciesId: idWithTalent("zele") }
        expect(talentEffect(m)?.stabBonus).toBe(0.05)
        expect(talentOutgoingDmgMult(m, { stab: true, typeEff: 1, isCrit: false, moveType: "FEU", mainType: "FEU", targetHpFrac: 1 })).toBeCloseTo(1.05)
        expect(talentOutgoingDmgMult(m, { stab: false, typeEff: 1, isCrit: false, moveType: "NORMAL", mainType: "FEU", targetHpFrac: 1 })).toBe(1)
    })

    it("Acharnement : +5 % seulement si cible < 25 % PV", () => {
        const m = { speciesId: idWithTalent("acharnement") }
        expect(talentOutgoingDmgMult(m, { stab: false, typeEff: 1, isCrit: false, moveType: "NORMAL", targetHpFrac: 0.2 })).toBeCloseTo(1.05)
        expect(talentOutgoingDmgMult(m, { stab: false, typeEff: 1, isCrit: false, moveType: "NORMAL", targetHpFrac: 0.5 })).toBe(1)
    })

    it("Cuir épais : −5 % de tous les dégâts subis (défenseur)", () => {
        const m = { speciesId: idWithTalent("cuir_epais") }
        expect(talentIncomingDmgMult(m, { typeEff: 1, isPhysical: false })).toBeCloseTo(0.95)
    })

    it("Réflexes : ×1,05 Vitesse", () => {
        expect(talentSpeedMult({ speciesId: idWithTalent("reflexes") })).toBeCloseTo(1.05)
    })
})
