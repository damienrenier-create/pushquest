import { describe, it, expect } from "vitest"
import { MOVES } from "../data/moves"
import { CTS } from "../data/cts"
import { SPECIES } from "../data/species"
import { createMonInstance } from "../battle/factory"
import { moveOptionsFor } from "../create/customSpecies"
import { POKE_TYPES } from "../battle/types"
import { relearnableMoves } from "./playerStore"

// SIGNATURES APPRISES EN MONTANT DE NIVEAU, ET NULLE PART AILLEURS (Sartay, 01/11/2026) : « Raitei, Rancœur Céleste + l'attaque de
// Florapanthe ne devraient être nulle part à part en apprentissage inné du Daemon ! impossible de les acheter ! »
// → ni CT, ni Maître des capacités (relearnableMoves), ni Créateur de Daemon.

const SIGS = ["rancoeur_celeste", "raitei", "ronces_vampires"]

describe("Signatures `levelUpOnly` : en montant de niveau, nulle part ailleurs", () => {
    it("exactement ces trois attaques sont marquées levelUpOnly, chacune apprise par une seule espèce", () => {
        expect(Object.values(MOVES).filter((m) => m.levelUpOnly).map((m) => m.id).sort()).toEqual([...SIGS].sort())
        const learners = (id: string) => Object.values(SPECIES).filter((s) => s.learnset.some((l) => l.moveId === id)).map((s) => s.id)
        expect(learners("rancoeur_celeste")).toEqual(["namizeus"])
        expect(learners("raitei")).toEqual(["namizeus"])
        expect(learners("ronces_vampires")).toEqual(["florapanthe"])
    })
    it("aucune CT ne les enseigne", () => {
        for (const c of CTS) expect(SIGS, c.id).not.toContain(c.moveId)
    })
    it("le Maître des capacités ne les propose JAMAIS, même au niveau 100 sans elles (le reste du learnset, si)", () => {
        const nz = createMonInstance("namizeus", 100, { owned: true, moveIds: ["leche"] })
        const fl = createMonInstance("florapanthe", 100, { owned: true, moveIds: ["leche"] })
        const rn = relearnableMoves(nz), rf = relearnableMoves(fl)
        for (const id of SIGS) { expect(rn, id).not.toContain(id); expect(rf, id).not.toContain(id) }
        expect(rn).toContain("frappe_audela") // contrôle : le Maître vend toujours le reste du learnset
        expect(rn).toContain("onde_folie")
        expect(rf.length).toBeGreaterThan(0)
    })
    it("le Créateur de Daemon ne les propose jamais (tous les types, tous les niveaux)", () => {
        for (const t of POKE_TYPES) for (const lv of [18, 50, 66, 85, 100]) {
            const opts = moveOptionsFor([t], lv)
            for (const id of SIGS) expect(opts, `${t} niv ${lv}`).not.toContain(id)
        }
    })
})
