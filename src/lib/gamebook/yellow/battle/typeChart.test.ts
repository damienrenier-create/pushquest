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
        for (const t of ["NORMAL", "COMBAT", "VOL", "POISON", "SOL", "ROCHE", "INSECTE", "SPECTRE", "METAL"] as const) {
            expect(moveCategory(t)).toBe("PHYSICAL")
        }
    })
    it("types spéciaux", () => {
        for (const t of ["FEU", "EAU", "PLANTE", "ELEC", "GLACE", "PSY", "DRAGON", "FEE"] as const) {
            expect(moveCategory(t)).toBe("SPECIAL")
        }
    })
})

describe("MÉTAL — type forteresse (run 3)", () => {
    it("offensif : super efficace ×2 contre Glace / Roche / Fée", () => {
        expect(typeMultiplier("METAL", "GLACE")).toBe(2)
        expect(typeMultiplier("METAL", "ROCHE")).toBe(2)
        expect(typeMultiplier("METAL", "FEE")).toBe(2)
    })
    it("offensif : peu efficace ×0.5 contre Feu / Eau / Élec / Métal", () => {
        for (const d of ["FEU", "EAU", "ELEC", "METAL"] as const) expect(typeMultiplier("METAL", d)).toBe(0.5)
    })
    it("défensif : faible ×2 au Feu / Combat / Sol seulement", () => {
        for (const a of ["FEU", "COMBAT", "SOL"] as const) expect(typeMultiplier(a, "METAL")).toBe(2)
    })
    it("défensif : immunisé (×0) au Poison", () => {
        expect(typeMultiplier("POISON", "METAL")).toBe(0)
    })
    it("défensif : résiste (×0.5) à une dizaine de types", () => {
        for (const a of ["NORMAL", "PLANTE", "GLACE", "VOL", "PSY", "INSECTE", "ROCHE", "DRAGON", "FEE", "METAL"] as const) {
            expect(typeMultiplier(a, "METAL")).toBe(0.5)
        }
    })
    it("défensif : neutre à Eau / Élec / Spectre", () => {
        for (const a of ["EAU", "ELEC", "SPECTRE"] as const) expect(typeMultiplier(a, "METAL")).toBe(1)
    })
    it("Feu/Métal (Magnetor) : double faiblesse au Sol, mais encaisse la Glace", () => {
        // Feu/Métal contre SOL : SOL×FEU = 2, SOL×METAL = 2 → ×4 (double faiblesse au Sol = son gros trou).
        expect(typeEffectiveness("SOL", ["FEU", "METAL"])).toBe(4)
        // Feu/Métal encaisse GLACE : le Feu y est neutre (×1) mais le Métal résiste (×0.5) → ×0.5.
        expect(typeEffectiveness("GLACE", ["FEU", "METAL"])).toBe(0.5)
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
