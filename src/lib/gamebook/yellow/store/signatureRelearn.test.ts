import { describe, it, expect } from "vitest"
import { CTS } from "../data/cts"
import { SPECIES } from "../data/species"
import { createMonInstance } from "../battle/factory"
import { moveOptionsFor } from "../create/customSpecies"
import { POKE_TYPES } from "../battle/types"
import { relearnableMoves } from "./playerStore"

// SIGNATURES (Ronces Vampires de Florapanthe, Rancœur Céleste et Raitei de Namizeus) — Sartay, 01/11/2026 : jamais achetables
// (aucune CT, refusées au Créateur de Daemon) ; le Maître des capacités les RÉAPPREND, mais seulement à l'espèce qui les apprend
// en montant de niveau (« je n'avais pas compris qu'elle pouvait être réapprise, c'est ok pour moi dans ce cas »).

const SIGS: Record<string, { sp: string; lvl: number }> = {
    rancoeur_celeste: { sp: "namizeus", lvl: 50 }, raitei: { sp: "namizeus", lvl: 66 }, ronces_vampires: { sp: "florapanthe", lvl: 85 },
}

describe("Signatures : jamais achetables, réapprenables par leur seule espèce", () => {
    it("une seule espèce les apprend, en montant de niveau", () => {
        for (const [id, s] of Object.entries(SIGS)) {
            const learners = Object.values(SPECIES).filter((sp) => sp.learnset.some((l) => l.moveId === id))
            expect(learners.map((sp) => sp.id), id).toEqual([s.sp])
            expect(learners[0].learnset.find((l) => l.moveId === id)?.level, id).toBe(s.lvl)
        }
    })
    it("aucune CT ne les enseigne", () => {
        for (const c of CTS) expect(Object.keys(SIGS), c.id).not.toContain(c.moveId)
    })
    it("le Créateur de Daemon ne les propose jamais (tous les types, tous les niveaux)", () => {
        for (const t of POKE_TYPES) for (const lv of [18, 50, 66, 85, 100]) {
            const opts = moveOptionsFor([t], lv)
            for (const id of Object.keys(SIGS)) expect(opts, `${t} niv ${lv}`).not.toContain(id)
        }
    })
    it("le Maître des capacités les réapprend à LEUR espèce une fois le niveau atteint, jamais avant", () => {
        expect(relearnableMoves(createMonInstance("namizeus", 100, { owned: true, moveIds: ["leche"] }))).toEqual(expect.arrayContaining(["rancoeur_celeste", "raitei"]))
        expect(relearnableMoves(createMonInstance("namizeus", 60, { owned: true, moveIds: ["leche"] }))).toContain("rancoeur_celeste")
        expect(relearnableMoves(createMonInstance("namizeus", 60, { owned: true, moveIds: ["leche"] }))).not.toContain("raitei")
        expect(relearnableMoves(createMonInstance("namizeus", 49, { owned: true, moveIds: ["leche"] }))).not.toContain("rancoeur_celeste")
        expect(relearnableMoves(createMonInstance("florapanthe", 100, { owned: true, moveIds: ["leche"] }))).toContain("ronces_vampires")
        expect(relearnableMoves(createMonInstance("florapanthe", 84, { owned: true, moveIds: ["leche"] }))).not.toContain("ronces_vampires")
    })
})
