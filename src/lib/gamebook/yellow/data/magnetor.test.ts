import { describe, it, expect, beforeEach } from "vitest"
import { hydratePlayer, evolveMagmatorWithChen, getPlayer } from "../store/playerStore"
import { hydratePokedex, getPokedex } from "../store/pokedexStore"
import { createMonInstance } from "../battle/factory"
import { getSpecies } from "./species"

beforeEach(() => { hydratePokedex({ seen: [], caught: [] }) })

describe("MAGNETOR — base 4 Feu/Métal, évolution de Magmator (offre du Prof CHEN)", () => {
    it("Magnetor est Feu/Métal, forteresse (Défense >> Magmator)", () => {
        const sp = getSpecies("magnetor")!
        expect(sp.types).toEqual(["FEU", "METAL"])
        expect(sp.baseStats.def).toBeGreaterThan(getSpecies("magmator")!.baseStats.def)
        expect(sp.dexNo).toBe(144)
    })

    it("evolveMagmatorWithChen : magmator → magnetor, apprend du Métal, entre au Pokédex", () => {
        const m = createMonInstance("magmator", 60, { owned: true })
        hydratePlayer({ team: [m], pc: [] })
        const res = evolveMagmatorWithChen(m.uid)
        expect(res?.toId).toBe("magnetor")
        expect(getPlayer().team[0].speciesId).toBe("magnetor")
        expect(getPokedex().caught).toContain("magnetor")
        // il repart avec au moins une attaque MÉTAL (Tête de Fer, niv 1) — apprise ou en attente d'apprentissage
        const moves = [...getPlayer().team[0].moves.map((mv) => mv.moveId), ...(getPlayer().team[0].pendingMoves ?? [])]
        expect(moves).toContain("tete_de_fer")
    })

    it("fonctionne aussi sur un Magmator au PC", () => {
        const m = createMonInstance("magmator", 55, { owned: true })
        hydratePlayer({ team: [], pc: [m] })
        expect(evolveMagmatorWithChen(m.uid)?.toId).toBe("magnetor")
        expect(getPlayer().pc[0].speciesId).toBe("magnetor")
    })

    it("refuse : uid inconnu ou Daemon qui n'est pas un Magmator", () => {
        const other = createMonInstance("morrow", 60, { owned: true })
        hydratePlayer({ team: [other], pc: [] })
        expect(evolveMagmatorWithChen(other.uid)).toBeNull()
        expect(evolveMagmatorWithChen("uid-bidon")).toBeNull()
    })
})
