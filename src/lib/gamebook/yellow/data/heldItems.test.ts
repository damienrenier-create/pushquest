import { describe, it, expect } from "vitest"
import { createMonInstance } from "../battle/factory"
import { fullStats } from "../battle/stats"
import { computeDamage } from "../battle/damage"
import { getSpecies } from "./species"
import { heldOutgoingDmgMult, heldIncomingDmgMult } from "./heldItems"
import { parseSave, toMonInstance } from "../storage/save"
import type { SpeciesData } from "../battle/types"

const sp = (id: string): SpeciesData => {
    const s = getSpecies(id)
    if (!s) throw new Error(`espèce inconnue: ${id}`)
    return s
}

describe("objets tenus — effets passifs (stats / dégâts)", () => {
    it("signature : Galet Poli donne +20 % Vitesse à Rochison, rien aux autres stats", () => {
        const base = createMonInstance("rochison", 50)
        const held = { ...base, heldItem: "galet_poli" }
        const a = fullStats(base, sp("rochison"))
        const b = fullStats(held, sp("rochison"))
        expect(b.spe).toBe(Math.floor(a.spe * 1.2))
        expect(b.atk).toBe(a.atk)
        expect(b.def).toBe(a.def)
    })

    it("signature : verrou d'espèce — Galet Poli ne booste PAS un autre Daemon", () => {
        const base = createMonInstance("pyrokoss", 50)
        const held = { ...base, heldItem: "galet_poli" }
        expect(fullStats(held, sp("pyrokoss")).spe).toBe(fullStats(base, sp("pyrokoss")).spe)
    })

    it("Couronne de la Reine : +10 % Attaque ET Attaque Spé sur Regnantaur", () => {
        const base = createMonInstance("regnantaur", 50)
        const held = { ...base, heldItem: "couronne_reine" }
        const a = fullStats(base, sp("regnantaur"))
        const b = fullStats(held, sp("regnantaur"))
        expect(b.atk).toBe(Math.floor(a.atk * 1.1))
        expect(b.spc).toBe(Math.floor(a.spc * 1.1))
        expect(b.def).toBe(a.def)
    })

    it("objet de type : +10 % dégâts du bon type seulement", () => {
        const charbon = { speciesId: "pyrokoss", heldItem: "charbon" }
        expect(heldOutgoingDmgMult(charbon, "FEU")).toBeCloseTo(1.1)
        expect(heldOutgoingDmgMult(charbon, "EAU")).toBe(1)
    })

    it("Coquille Tony : −20 % dégâts physiques (Tonytony only, physique only)", () => {
        const tony = { speciesId: "tonytony", heldItem: "coquille_tony" }
        expect(heldIncomingDmgMult(tony, true)).toBeCloseTo(0.8)
        expect(heldIncomingDmgMult(tony, false)).toBe(1)
        expect(heldIncomingDmgMult({ speciesId: "rochison", heldItem: "coquille_tony" }, true)).toBe(1)
    })

    it("computeDamage applique itemMult", () => {
        const base = { level: 50, power: 80, attack: 100, defense: 100, stab: false, typeEff: 1, isCrit: false, randomFactor: 1 }
        expect(computeDamage({ ...base, itemMult: 1.1 }).damage).toBeGreaterThan(computeDamage(base).damage)
        expect(computeDamage({ ...base, itemMult: 0.8 }).damage).toBeLessThan(computeDamage(base).damage)
    })
})

describe("objets tenus — round-trip de save", () => {
    it("parseSave conserve heldItem sur les Daemons de l'équipe", () => {
        const mon = createMonInstance("rochison", 30, { owned: true })
        mon.heldItem = "galet_poli"
        const parsed = parseSave({ version: 99, team: [mon], pc: [], pokedex: { seen: [], caught: [] } })
        expect(parsed.team[0]?.heldItem).toBe("galet_poli")
    })

    it("toMonInstance conserve heldItem (post-combat)", () => {
        const mon = createMonInstance("tonytony", 20)
        mon.heldItem = "coquille_tony"
        expect(toMonInstance({ ...mon, stages: {}, volatiles: {} }).heldItem).toBe("coquille_tony")
    })

    it("parseSave rejette un heldItem non-string", () => {
        const mon = createMonInstance("rochison", 30)
        const parsed = parseSave({ version: 99, team: [{ ...mon, heldItem: 123 }], pc: [], pokedex: { seen: [], caught: [] } })
        expect(parsed.team[0]?.heldItem).toBeUndefined()
    })
})
