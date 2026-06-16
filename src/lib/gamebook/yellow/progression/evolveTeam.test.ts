import { describe, it, expect } from "vitest"
import { createMonInstance } from "../battle/factory"
import { evolveTeam } from "./evolveTeam"

describe("evolveTeam — snapshot pour annulation (touche B)", () => {
    it("évolue, renvoie uid + snapshot d'avant, et le snapshot permet de REVERT", () => {
        const mon = createMonInstance("piouflot", 20, { owned: true }) // Piouflot évolue en Hérondée à 17
        const movesBefore = mon.moves.map((m) => m.moveId)
        const evos = evolveTeam([mon])

        expect(evos.length).toBe(1)
        const e = evos[0]
        expect(e.uid).toBe(mon.uid)
        expect(e.fromId).toBe("piouflot")
        expect(e.toId).toBe("herondee")           // à N20, la chaîne s'arrête à Hérondée (Oragron = N35)
        expect(e.beforeSpeciesId).toBe("piouflot")
        expect(mon.speciesId).toBe("herondee")     // l'instance a bien été mutée

        // ANNULATION : restaurer depuis le snapshot doit redonner exactement la forme d'avant.
        mon.speciesId = e.beforeSpeciesId
        mon.moves = e.beforeMoves.map((m) => ({ ...m }))
        mon.pendingMoves = [...e.beforePendingMoves]
        expect(mon.speciesId).toBe("piouflot")
        expect(mon.moves.map((m) => m.moveId)).toEqual(movesBefore)
    })

    it("aucune évolution si le niveau n'atteint pas le palier", () => {
        const mon = createMonInstance("piouflot", 10, { owned: true }) // < 17
        expect(evolveTeam([mon]).length).toBe(0)
        expect(mon.speciesId).toBe("piouflot")
    })
})
