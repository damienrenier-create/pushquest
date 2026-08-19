import { describe, it, expect, beforeEach } from "vitest"
import { hydratePlayer, evolveWithItem, getPlayer } from "../store/playerStore"
import { hydratePokedex } from "../store/pokedexStore"
import { createMonInstance } from "../battle/factory"
import { registerCustomSpecies, getSpecies } from "./species"
import { FUSION_BASE_SPECIES } from "./fusionBaseSpecies"

// Basaltor / Sidérobloc = espèces custom (Fusiodex, hors SPECIES) → à enregistrer pour les résoudre en test.
registerCustomSpecies(FUSION_BASE_SPECIES)
beforeEach(() => { hydratePokedex({ seen: [], caught: [] }) })

describe("Sidérobloc — évolution de Basaltor par le Noyau de Métal (évo par OBJET générique)", () => {
    it("Basaltor déclare bien une évolution { kind: ITEM, itemId: noyau_metal } → siderobloc", () => {
        const evo = getSpecies("basaltor")?.evolution
        expect(evo?.toId).toBe("siderobloc")
        expect(evo?.method).toEqual({ kind: "ITEM", itemId: "noyau_metal" })
        expect(getSpecies("siderobloc")?.types).toEqual(["ROCHE", "METAL"])
    })

    it("Basaltor + Noyau de Métal → Sidérobloc, Noyau consommé", () => {
        const m = createMonInstance("basaltor", 40, { owned: true })
        hydratePlayer({ team: [m], pc: [], items: { noyau_metal: 1 } })
        const res = evolveWithItem(m.uid, "noyau_metal")
        expect(res?.toId).toBe("siderobloc")
        expect(getPlayer().team[0].speciesId).toBe("siderobloc")
        expect(getPlayer().items["noyau_metal"]).toBe(0) // consommé
    })

    it("refuse sans le Noyau, ou sur une espèce qui n'évolue PAS par cet objet", () => {
        const m = createMonInstance("basaltor", 40, { owned: true })
        hydratePlayer({ team: [m], pc: [], items: {} })
        expect(evolveWithItem(m.uid, "noyau_metal")).toBeNull() // pas de Noyau

        const scor = createMonInstance("scorieve", 20, { owned: true }) // Scoriève évolue par NIVEAU (pas par objet)
        hydratePlayer({ team: [scor], pc: [], items: { noyau_metal: 1 } })
        expect(evolveWithItem(scor.uid, "noyau_metal")).toBeNull()
        expect(getPlayer().items["noyau_metal"]).toBe(1) // NON consommé si refus
    })
})
