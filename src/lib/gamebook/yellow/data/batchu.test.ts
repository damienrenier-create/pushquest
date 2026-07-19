import { describe, it, expect } from "vitest"
import { getSpecies, SPECIES_IDS } from "./species"
import { getMove } from "./moves"

describe("Batchu → Supabatchu — chauves-souris électriques (annoyers fulgurants)", () => {
    it("Batchu : dex 182, ÉLEC/VOL, BST 245, évolue en Supabatchu au niv 55, courbe rapide", () => {
        const b = getSpecies("batchu")!
        expect(b.dexNo).toBe(182)
        expect(b.types).toEqual(["ELEC", "VOL"])
        expect(Object.values(b.baseStats).reduce((a, c) => a + c, 0)).toBe(245)
        expect(b.evolution).toEqual({ toId: "supabatchu", method: { kind: "LEVEL", level: 55 } })
        expect(b.growthRate).toBe("medium_fast")
    })

    it("Supabatchu : dex 183, ÉLEC/VOL, BST 420, LE + rapide du jeu (Vit 140)", () => {
        const s = getSpecies("supabatchu")!
        expect(s.dexNo).toBe(183)
        expect(s.types).toEqual(["ELEC", "VOL"])
        expect(Object.values(s.baseStats).reduce((a, c) => a + c, 0)).toBe(420)
        expect(s.baseStats.spe).toBe(140)
        // Aucun autre Daemon n'est plus rapide → Supabatchu détient le record de Vitesse.
        const maxSpe = Math.max(...SPECIES_IDS.map((id) => getSpecies(id)!.baseStats.spe))
        expect(s.baseStats.spe).toBe(maxSpe)
    })

    it("kit annoyer : priorité + confusion + paralysie + poison grave + drain (moves réels)", () => {
        for (const id of ["vive_attaque", "onde_folie", "cage_eclair", "toxik", "vampelec", "ultrasons"]) {
            expect(getMove(id), id).toBeTruthy()
        }
        // Vampélec = drain 50 % ; Ultrasons = confusion + baisse de Précision.
        expect(getMove("vampelec")!.effect?.drainPct).toBe(50)
        expect(getMove("ultrasons")!.effect?.inflictVolatile).toBe("CONFUSION")
        expect(getMove("ultrasons")!.effect?.statChanges?.some((sc) => sc.stat === "acc" && sc.stages < 0)).toBe(true)
        // Batchu apprend confusion + drain + poison + paralysie ; Supabatchu ajoute Ultrasons + Ultra-Foudre.
        const bMoves = getSpecies("batchu")!.learnset.map((l) => l.moveId)
        for (const id of ["vive_attaque", "onde_folie", "vampelec", "toxik", "cage_eclair"]) expect(bMoves, id).toContain(id)
        const sMoves = getSpecies("supabatchu")!.learnset.map((l) => l.moveId)
        for (const id of ["ultrasons", "ultra_foudre"]) expect(sMoves, id).toContain(id)
    })
})
