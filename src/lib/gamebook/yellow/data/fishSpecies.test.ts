import { describe, it, expect } from "vitest"
import { getSpecies } from "./species"
import { getMove } from "./moves"

describe("Pêche — Osquille & Rô (espèces + learnsets valides)", () => {
    it("Osquille (205) : INSECTE/EAU, glass cannon physique ; tous les moves du learnset existent", () => {
        const sp = getSpecies("osquille")!
        expect(sp).toBeDefined()
        expect(sp.dexNo).toBe(205)
        expect(sp.types).toEqual(["INSECTE", "EAU"])
        expect(sp.baseStats).toEqual({ hp: 65, atk: 135, def: 68, spe: 132, spc: 48 })
        for (const l of sp.learnset) expect(getMove(l.moveId), `move manquant: ${l.moveId}`).toBeDefined()
    })
    it("Rô (206) : SOL/EAU, perturbatrice ; tous les moves du learnset existent", () => {
        const sp = getSpecies("ro")!
        expect(sp).toBeDefined()
        expect(sp.dexNo).toBe(206)
        expect(sp.types).toEqual(["SOL", "EAU"])
        expect(sp.baseStats).toEqual({ hp: 88, atk: 84, def: 88, spe: 106, spc: 82 })
        for (const l of sp.learnset) expect(getMove(l.moveId), `move manquant: ${l.moveId}`).toBeDefined()
    })
    it("Frappe Cavitation : la 1ʳᵉ attaque EAU PHYSIQUE à priorité du jeu", () => {
        const m = getMove("frappe_cavitation")!
        expect(m.type).toBe("EAU")
        expect(m.category).toBe("PHYSICAL")
        expect(m.priority).toBe(1)
        expect(m.power).toBe(55)
    })
})
