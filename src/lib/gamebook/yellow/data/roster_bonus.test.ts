import { describe, it, expect } from "vitest"
import { getSpecies } from "./species"
import { getMove } from "./moves"
import { createMonInstance } from "../battle/factory"
import { POKE_TYPES } from "../battle/types"

// Les 7 familles bonus (couverture de types) + leurs lignées.
const LINES = [
    ["electroatiss", "couranti", "zappeureal"],
    ["auroruff", "glaceer", "auroraur"],
    ["ruffiant", "formiguer", "regnantaur"],
    ["lavapetit", "fissuralave", "magmator"],
    ["nouillon", "vermisaint", "divinpate"],
    ["piouflot", "herondee", "oragron"],
    ["broussours", "sylvours", "druidours"],
]
const BONUS = LINES.flat()

describe("familles bonus — intégrité", () => {
    it("les 21 espèces existent", () => {
        for (const id of BONUS) expect(getSpecies(id), id).not.toBeNull()
        expect(BONUS.length).toBe(21)
    })

    it("5 stats positives, types valides, sprite cohérent", () => {
        for (const id of BONUS) {
            const sp = getSpecies(id)!
            for (const k of ["hp", "atk", "def", "spe", "spc"] as const) {
                expect(sp.baseStats[k], `${id}.${k}`).toBeGreaterThan(0)
            }
            for (const t of sp.types) expect(POKE_TYPES).toContain(t)
            expect(sp.sprite).toBe(`/yellow/sprites/dex/${id}.png`)
        }
    })

    it("toutes les attaques des learnsets existent", () => {
        for (const id of BONUS) {
            for (const e of getSpecies(id)!.learnset) {
                expect(getMove(e.moveId), `${id}: ${e.moveId}`).not.toBeNull()
            }
        }
    })

    it("chaque Daemon se fabrique (PV pleins, 1..4 attaques)", () => {
        for (const id of BONUS) {
            const m = createMonInstance(id, 20)
            expect(m.currentHp).toBeGreaterThan(0)
            expect(m.moves.length).toBeGreaterThanOrEqual(1)
            expect(m.moves.length).toBeLessThanOrEqual(4)
        }
    })

    it("lignées d'évolution : stades 1→2→3 chaînés, stade 3 terminal", () => {
        for (const [a, b, c] of LINES) {
            expect(getSpecies(a)!.evolution?.toId, a).toBe(b)
            expect(getSpecies(b)!.evolution?.toId, b).toBe(c)
            expect(getSpecies(c)!.evolution, c).toBeUndefined()
        }
    })

    it("couvre les types Élec, Glace, Insecte, Psy via ces familles", () => {
        expect(getSpecies("electroatiss")!.types).toContain("ELEC")
        expect(getSpecies("auroruff")!.types).toContain("GLACE")
        expect(getSpecies("ruffiant")!.types).toContain("INSECTE")
        expect(getSpecies("regnantaur")!.types).toContain("PSY")
        expect(getSpecies("nouillon")!.types).toContain("PSY")
    })
})
