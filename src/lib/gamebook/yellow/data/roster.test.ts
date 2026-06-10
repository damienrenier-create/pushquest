import { describe, it, expect } from "vitest"
import { SPECIES, getSpecies } from "./species"
import { getMove } from "./moves"
import { createMonInstance } from "../battle/factory"
import { POKE_TYPES } from "../battle/types"

// Les 18 du roster (2 triangles) + leurs lignées d'évolution.
const LINES = [
    ["feuillichot", "broutame", "sylvapuce"],
    ["gouttiny", "ondulo", "razmaree"],
    ["braisille", "flamkure", "pyrokoss"],
    ["plumiot", "faukon", "aquilothan"],
    ["cailloutchi", "roctaur", "rochison"],
    ["couperin", "frappard", "maitrezenc"],
]
const ROSTER = LINES.flat()

describe("roster des 18 — intégrité", () => {
    it("les 18 espèces existent", () => {
        for (const id of ROSTER) expect(getSpecies(id), id).not.toBeNull()
        expect(ROSTER.length).toBe(18)
    })

    it("dexNo uniques sur tout le registre", () => {
        const nos = Object.values(SPECIES).map((s) => s.dexNo)
        expect(new Set(nos).size).toBe(nos.length)
    })

    it("chaque espèce du roster : 5 stats positives, types valides, sprite cohérent", () => {
        for (const id of ROSTER) {
            const sp = getSpecies(id)!
            for (const k of ["hp", "atk", "def", "spe", "spc"] as const) {
                expect(sp.baseStats[k], `${id}.${k}`).toBeGreaterThan(0)
            }
            expect(sp.types.length).toBeGreaterThanOrEqual(1)
            for (const t of sp.types) expect(POKE_TYPES).toContain(t)
            expect(sp.sprite).toBe(`/yellow/sprites/dex/${id}.png`)
        }
    })

    it("toutes les attaques des learnsets existent", () => {
        for (const id of ROSTER) {
            for (const entry of getSpecies(id)!.learnset) {
                expect(getMove(entry.moveId), `${id}: ${entry.moveId}`).not.toBeNull()
            }
        }
    })

    it("chaque Daemon se fabrique (PV pleins, 1..4 attaques)", () => {
        for (const id of ROSTER) {
            const m = createMonInstance(id, 20)
            expect(m.currentHp).toBeGreaterThan(0)
            expect(m.moves.length).toBeGreaterThanOrEqual(1)
            expect(m.moves.length).toBeLessThanOrEqual(4)
        }
    })
})

describe("lignées d'évolution", () => {
    it("les stades 1 et 2 évoluent vers le stade suivant ; le stade 3 n'évolue pas", () => {
        for (const [a, b, c] of LINES) {
            expect(getSpecies(a)!.evolution?.toId, a).toBe(b)
            expect(getSpecies(b)!.evolution?.toId, b).toBe(c)
            expect(getSpecies(c)!.evolution, c).toBeUndefined()
        }
    })

    it("méthodes d'évolution conformes (toutes par niveau pour l'instant)", () => {
        expect(getSpecies("feuillichot")!.evolution!.method).toEqual({ kind: "LEVEL", level: 16 })
        expect(getSpecies("broutame")!.evolution!.method).toEqual({ kind: "LEVEL", level: 32 })
        expect(getSpecies("plumiot")!.evolution!.method).toEqual({ kind: "LEVEL", level: 18 })
        expect(getSpecies("couperin")!.evolution!.method).toEqual({ kind: "LEVEL", level: 28 })
        expect(getSpecies("roctaur")!.evolution!.method).toEqual({ kind: "TRADE" })
    })
})
