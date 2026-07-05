import { describe, it, expect } from "vitest"
import { typeMultiplier, typeEffectiveness, moveCategory, effectivenessMessage } from "./typeChart"

describe("typeMultiplier", () => {
    it("super efficace = 2", () => {
        expect(typeMultiplier("EAU", "FEU")).toBe(2)
        expect(typeMultiplier("ELEC", "EAU")).toBe(2)
    })
    it("pas très efficace = 0.5", () => {
        expect(typeMultiplier("FEU", "EAU")).toBe(0.5)
    })
    it("immunité = 0", () => {
        expect(typeMultiplier("ELEC", "SOL")).toBe(0)
        expect(typeMultiplier("NORMAL", "SPECTRE")).toBe(0)
        expect(typeMultiplier("SOL", "VOL")).toBe(0)
    })
    it("neutre (non listé) = 1", () => {
        expect(typeMultiplier("NORMAL", "EAU")).toBe(1)
    })
})

describe("typeEffectiveness (double type, multiplicatif)", () => {
    it("double faiblesse = 4", () => {
        // EAU contre ROCHE/SOL : 2 × 2.
        expect(typeEffectiveness("EAU", ["ROCHE", "SOL"])).toBe(4)
    })
    it("faiblesse + résistance s'annulent = 1", () => {
        // PLANTE contre EAU(×2)/VOL(×0.5).
        expect(typeEffectiveness("PLANTE", ["EAU", "VOL"])).toBe(1)
    })
    it("une immunité écrase tout = 0", () => {
        expect(typeEffectiveness("SOL", ["VOL", "FEU"])).toBe(0)
    })
})

describe("moveCategory (catégorie par le TYPE — règle Gen 1)", () => {
    it("types physiques", () => {
        for (const t of ["NORMAL", "COMBAT", "VOL", "POISON", "SOL", "ROCHE", "INSECTE", "SPECTRE"] as const) {
            expect(moveCategory(t)).toBe("PHYSICAL")
        }
    })
    it("types spéciaux", () => {
        for (const t of ["FEU", "EAU", "PLANTE", "ELEC", "GLACE", "PSY", "DRAGON", "FEE"] as const) {
            expect(moveCategory(t)).toBe("SPECIAL")
        }
    })
})

describe("effectivenessMessage", () => {
    it("messages selon le multiplicateur", () => {
        expect(effectivenessMessage(0)).toMatch(/n'affecte pas/)
        expect(effectivenessMessage(2)).toMatch(/super efficace/)
        expect(effectivenessMessage(4)).toMatch(/super efficace/)
        expect(effectivenessMessage(0.5)).toMatch(/pas très efficace/)
        expect(effectivenessMessage(1)).toBeNull()
    })
})
