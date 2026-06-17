import { describe, it, expect } from "vitest"
import { getSpecies } from "./species"
import { getMove } from "./moves"
import { getItem } from "./items"

describe("Tonytony — œuf-soigneur (stats Chansey) + Berceuse + Daemonflûte", () => {
    it("espèce NORMAL dexNo 134, stats Chansey (PV 250 / DÉF 5), learnset valide", () => {
        const t = getSpecies("tonytony")!
        expect(t.types).toEqual(["NORMAL"])
        expect(t.dexNo).toBe(134)
        expect(t.baseStats).toEqual({ hp: 250, atk: 5, def: 5, spe: 50, spc: 105 })
        // tous les moveId du learnset existent (anti-typo)
        for (const l of t.learnset) expect(getMove(l.moveId), `move ${l.moveId} introuvable`).toBeTruthy()
        const has = (id: string) => t.learnset.some((l) => l.moveId === id)
        // identité Chansey : BoltBeam + soin + double statut + mur spé
        expect(has("souffle_polaire")).toBe(true) // Ice Beam
        expect(has("fulgurance")).toBe(true)       // Thunderbolt
        expect(has("repos")).toBe(true)            // Soft-Boiled
        expect(has("berceuse")).toBe(true)         // Sing
        expect(has("cage_eclair")).toBe(true)      // Thunder Wave
        expect(has("focalisation")).toBe(true)     // mur spécial
    })

    it("Berceuse : NORMAL, statut sommeil, précision 55", () => {
        const m = getMove("berceuse")!
        expect(m.type).toBe("NORMAL")
        expect(m.power).toBe(0)
        expect(m.accuracy).toBe(55)
        expect(m.effect?.inflictStatus).toBe("SLEEP")
    })

    it("Daemonflûte : objet clé (MISC)", () => {
        const i = getItem("daemonflute")!
        expect(i.category).toBe("MISC")
    })
})
