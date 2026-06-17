import { describe, it, expect } from "vitest"
import { getSpecies } from "./species"
import { getMove } from "./moves"

describe("Sylvebarbe — Sol/Plante (tank lent) + Lance-Soleil", () => {
    it("espèce SOL/PLANTE dexNo 133, très lent, learnset valide (moves existants)", () => {
        const s = getSpecies("sylvebarbe")!
        expect(s.types).toEqual(["SOL", "PLANTE"])
        expect(s.dexNo).toBe(133)
        expect(s.baseStats.spe).toBeLessThanOrEqual(35) // colosse très lent
        // tous les moveId du learnset doivent résoudre (anti-typo)
        for (const l of s.learnset) expect(getMove(l.moveId), `move ${l.moveId} introuvable`).toBeTruthy()
        const lvlOf = (id: string) => s.learnset.find((l) => l.moveId === id)?.level
        expect(lvlOf("vampigraine")).toBe(30)
        expect(lvlOf("focalisation")).toBe(60) // booste le Spécial
        expect(lvlOf("mirage")).toBe(70)
        expect(lvlOf("lance_soleil")).toBe(90)
        // Étreinte Sylvestre = CT du champion unique → JAMAIS dans le learnset.
        expect(s.learnset.some((l) => l.moveId === "etreinte_sylvestre")).toBe(false)
    })

    it("Lance-Soleil : PLANTE, puissance 120, en 2 temps (la + forte attaque Plante)", () => {
        const m = getMove("lance_soleil")!
        expect(m.type).toBe("PLANTE")
        expect(m.power).toBe(120)
        expect(m.effect?.twoTurn).toBe(true)
    })
})
