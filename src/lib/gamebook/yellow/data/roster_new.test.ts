import { describe, it, expect } from "vitest"
import { getSpecies } from "./species"
import { getMove } from "./moves"
import { createMonInstance } from "../battle/factory"
import { POKE_TYPES } from "../battle/types"

// 8 familles supplémentaires (couverture Dragon/Spectre/Poison + variantes starters).
const LINES = [
    ["pampousse", "feliane", "cerfeuillu"],
    ["loutrille", "ondaloutre", "naiadrak"],
    ["fennaise", "pyrenard", "loupyre"],
    ["forgeotin", "marteloutan", "enclumind"],
    ["trolystrik", "brutetrik", "hebulmin"],
    ["draclet", "wyverion", "draconarque"],
    ["cornaissant", "corvenin", "necrocorbe"],
    ["sporbeo", "lampignon", "mycedruide"],
]
const NEW = LINES.flat()

describe("familles supplémentaires — intégrité", () => {
    it("les 24 espèces existent", () => {
        for (const id of NEW) expect(getSpecies(id), id).not.toBeNull()
        expect(NEW.length).toBe(24)
    })

    it("5 stats positives, types valides, sprite cohérent", () => {
        for (const id of NEW) {
            const sp = getSpecies(id)!
            for (const k of ["hp", "atk", "def", "spe", "spc"] as const) {
                expect(sp.baseStats[k], `${id}.${k}`).toBeGreaterThan(0)
            }
            for (const t of sp.types) expect(POKE_TYPES).toContain(t)
            expect(sp.sprite).toBe(`/yellow/sprites/dex/${id}.png`)
        }
    })

    it("toutes les attaques des learnsets existent", () => {
        for (const id of NEW) {
            for (const e of getSpecies(id)!.learnset) {
                expect(getMove(e.moveId), `${id}: ${e.moveId}`).not.toBeNull()
            }
        }
    })

    it("chaque Daemon se fabrique (PV pleins, 1..4 attaques)", () => {
        for (const id of NEW) {
            const m = createMonInstance(id, 25)
            expect(m.currentHp).toBeGreaterThan(0)
            expect(m.moves.length).toBeGreaterThanOrEqual(1)
            expect(m.moves.length).toBeLessThanOrEqual(4)
        }
    })

    it("lignées d'évolution : 1→2→3 chaînées, stade 3 terminal", () => {
        for (const [a, b, c] of LINES) {
            expect(getSpecies(a)!.evolution?.toId, a).toBe(b)
            expect(getSpecies(b)!.evolution?.toId, b).toBe(c)
            expect(getSpecies(c)!.evolution, c).toBeUndefined()
        }
    })

    it("comble Dragon, Spectre, Poison ; héron Oragron en Vol/Élec", () => {
        expect(getSpecies("draclet")!.types).toContain("DRAGON")
        expect(getSpecies("sporbeo")!.types).toContain("SPECTRE")
        expect(getSpecies("cornaissant")!.types).toContain("POISON")
        expect(getSpecies("oragron")!.types).toEqual(["VOL", "ELEC"])
    })

    it("les légataires ont bien été retirés", () => {
        for (const id of ["pousstout", "flordaemon", "rongeur", "piafeu", "galet", "bulle"]) {
            expect(getSpecies(id), id).toBeNull()
        }
    })
})
