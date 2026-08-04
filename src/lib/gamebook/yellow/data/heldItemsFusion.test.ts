import { describe, it, expect } from "vitest"
import { HELD_ITEMS, heldStatMult, heldOutgoingDmgMult, heldIncomingDmgMult, heldEffect } from "./heldItems"

// OBJETS TENUS — un FUSIONNÉ hérite des 2 objets de ses parents (heldItem + heldItem2). Les helpers les COMBINENT
// (le moteur les lit → engine.ts inchangé). Un Daemon normal (1 objet) reste byte-identique.
const all = Object.values(HELD_ITEMS)
const lefto = all.find((i) => i.leftoversFrac)!            // Restes (leftoversFrac 16)
const boost = all.find((i) => i.typeBoost && !i.species)!  // objet de type (+10 %, sans verrou d'espèce)

describe("Objets tenus — fusion à 2 objets", () => {
    it("PARITÉ : 1 seul objet = comportement inchangé", () => {
        expect(heldEffect({ heldItem: lefto.id })?.id).toBe(lefto.id)
        expect(heldEffect({})).toBeUndefined()
        expect(heldOutgoingDmgMult({ heldItem: boost.id }, boost.typeBoost!)).toBeCloseTo(1 + (boost.typeBoostPct ?? 10) / 100)
        const otherType = boost.typeBoost === "FEU" ? "EAU" : "FEU" // un type garanti ≠ de celui de l'objet
        expect(heldOutgoingDmgMult({ heldItem: boost.id }, otherType)).toBe(1) // type non concerné → pas de boost
    })

    it("type-boost : les 2 objets se MULTIPLIENT (produit)", () => {
        const single = 1 + (boost.typeBoostPct ?? 10) / 100
        expect(heldOutgoingDmgMult({ heldItem: boost.id, heldItem2: boost.id }, boost.typeBoost!)).toBeCloseTo(single * single)
    })

    it("leftovers : soin COMBINÉ (dénominateur harmonique = max/a + max/b)", () => {
        const merged = heldEffect({ heldItem: lefto.id, heldItem2: lefto.id })
        expect(merged?.leftoversFrac).toBeCloseTo(1 / (1 / lefto.leftoversFrac! + 1 / lefto.leftoversFrac!)) // 2×16 → 8
    })

    it("statMult : combiné par stat (produit) si un objet de stat non-signature existe", () => {
        const stat = all.find((i) => i.statMult && !i.species)
        if (!stat) return
        const k = Object.keys(stat.statMult!)[0] as keyof ReturnType<typeof heldStatMult>
        const v = (stat.statMult as Record<string, number>)[k as string]
        expect(heldStatMult({ heldItem: stat.id, heldItem2: stat.id })[k]).toBeCloseTo(v * v)
    })

    it("critStage : sommé quand les 2 objets en ont", () => {
        const crit = all.find((i) => i.critStage && !i.species)
        if (!crit) return
        expect(heldEffect({ heldItem: crit.id, heldItem2: crit.id })?.critStage).toBe(crit.critStage! * 2)
    })

    it("consommable (negateStatDrop / Herbe Blanche) : actif en slot 1, INERTE en slot 2 (pas d'immunité permanente)", () => {
        const herb = all.find((i) => i.negateStatDrop && !i.species)
        if (!herb) return
        expect(heldEffect({ heldItem: herb.id })?.negateStatDrop).toBe(true)             // slot 1 → actif (consommé via mon.heldItem)
        expect(heldEffect({ heldItem: lefto.id, heldItem2: herb.id })?.negateStatDrop).toBeFalsy() // slot 2 → NON combiné (sinon jamais consommé)
    })

    it("dégâts entrants physiques : les 2 réducteurs se multiplient", () => {
        const shell = all.find((i) => i.physDmgTakenMult !== undefined && !i.species)
        if (!shell) return
        expect(heldIncomingDmgMult({ heldItem: shell.id, heldItem2: shell.id }, true)).toBeCloseTo(shell.physDmgTakenMult! ** 2)
    })
})
