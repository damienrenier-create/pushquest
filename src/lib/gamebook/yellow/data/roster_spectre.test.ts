import { describe, it, expect } from "vitest"
import { getSpecies, SPECIES } from "./species"
import { getMove } from "./moves"
import { getCt } from "./cts"
import { createMonInstance } from "../battle/factory"
import { POKE_TYPES } from "../battle/types"

// Les 7 nouveaux Daemons SPECTRE de la maison hantée (chaînes d'évolution).
const SPECTRE_IDS = ["bouh", "bouhbou", "brook", "brookhante", "hibouh", "chouhante", "archibouh"]
const CHAINS: Array<[string, string]> = [
    ["bouh", "bouhbou"],
    ["brook", "brookhante"],
    ["hibouh", "chouhante"],
    ["chouhante", "archibouh"],
]

describe("roster SPECTRE maison hantée", () => {
    it("les 7 espèces existent avec 5 stats positives et des types valides", () => {
        for (const id of SPECTRE_IDS) {
            const sp = getSpecies(id)
            expect(sp, id).toBeTruthy()
            if (!sp) continue
            for (const k of ["hp", "atk", "def", "spe", "spc"] as const) expect(sp.baseStats[k], `${id}.${k}`).toBeGreaterThan(0)
            expect(sp.types.length).toBeGreaterThanOrEqual(1)
            expect(sp.types.length).toBeLessThanOrEqual(2)
            for (const t of sp.types) expect(POKE_TYPES, `${id} type ${t}`).toContain(t)
            expect(sp.sprite).toBe(`/yellow/sprites/dex/${id}.png`)
        }
    })

    it("dexNo uniques et libres (118-124, pas de collision)", () => {
        const nos = SPECTRE_IDS.map((id) => getSpecies(id)!.dexNo)
        expect(new Set(nos).size).toBe(nos.length)
        const allOthers = Object.values(SPECIES).filter((s) => !SPECTRE_IDS.includes(s.id)).map((s) => s.dexNo)
        for (const n of nos) expect(allOthers, `dexNo ${n} déjà pris`).not.toContain(n)
    })

    it("tous les moves de learnset existent, et un mon créé a 1-4 attaques", () => {
        for (const id of SPECTRE_IDS) {
            const sp = getSpecies(id)!
            for (const l of sp.learnset) expect(getMove(l.moveId), `${id} move ${l.moveId}`).toBeTruthy()
            const m = createMonInstance(id, 30)
            expect(m.moves.length, id).toBeGreaterThanOrEqual(1)
            expect(m.moves.length, id).toBeLessThanOrEqual(4)
        }
    })

    it("les cibles d'évolution existent et pointent dans la bonne chaîne", () => {
        for (const [from, to] of CHAINS) {
            const sp = getSpecies(from)!
            expect(sp.evolution?.toId, `${from} → ${to}`).toBe(to)
            expect(getSpecies(to), to).toBeTruthy()
        }
    })

    it("Brooks est MONO-SPECTRE (correction d'équilibrage) et Bouhbou est COMBAT/SPECTRE", () => {
        expect(getSpecies("brook")!.types).toEqual(["SPECTRE"])
        expect(getSpecies("brookhante")!.types).toEqual(["SPECTRE"])
        expect(getSpecies("bouhbou")!.types).toEqual(["COMBAT", "SPECTRE"])
    })

    it("la CT spectre (ct26) enseigne bien frappe_audela", () => {
        const ct = getCt("ct26")
        expect(ct?.moveId).toBe("frappe_audela")
        expect(getMove("frappe_audela")).toBeTruthy()
    })
})
