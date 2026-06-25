import { describe, it, expect } from "vitest"
import { CTS } from "../data/cts"
import { opponentMoveIds, ctRewardOptions, ctRewardOptionsForTeam } from "./rewards"

describe("Frontier — récompense CT (Usine)", () => {
    it("opponentMoveIds : ≤ 4 capacités, toutes existantes dans le learnset", () => {
        const moves = opponentMoveIds("pyrokoss", 100)
        expect(moves.length).toBeGreaterThan(0)
        expect(moves.length).toBeLessThanOrEqual(4)
    })

    it("ctRewardOptions : ne renvoie que des CT réelles, dont l'attaque est dans le moveset du vaincu", () => {
        const opts = ctRewardOptions("pyrokoss", 100)
        const allCtIds = new Set(CTS.map(c => c.id))
        for (const id of opts) expect(allCtIds.has(id)).toBe(true)
        // Pyrokoss à N100 connaît seisme (ct14) et flamme_ardente (ct09) → doivent être proposés
        const moves = new Set(opponentMoveIds("pyrokoss", 100))
        for (const id of opts) {
            const ct = CTS.find(c => c.id === id)!
            expect(moves.has(ct.moveId)).toBe(true)
        }
        expect(opts).toContain("ct14") // seisme
    })

    it("ctRewardOptionsForTeam : union dédupliquée des options de l'équipe", () => {
        const team = [{ speciesId: "pyrokoss", level: 100 }, { speciesId: "razmaree", level: 100 }]
        const opts = ctRewardOptionsForTeam(team)
        expect(new Set(opts).size).toBe(opts.length) // dédupliqué
        const a = new Set(ctRewardOptions("pyrokoss", 100))
        for (const id of a) expect(opts).toContain(id) // contient au moins celles de pyrokoss
    })

    it("espèce inconnue → aucune option", () => {
        expect(ctRewardOptions("espece_bidon", 50)).toEqual([])
        expect(opponentMoveIds("espece_bidon", 50)).toEqual([])
    })
})
