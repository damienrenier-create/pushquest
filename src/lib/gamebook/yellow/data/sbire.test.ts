import { describe, it, expect } from "vitest"
import { buildSbireTeam, sbireExplanation, SBIRE_MAX_FIGHTS_PER_DAY, SBIRE_TIPS } from "./sbire"
import { createMonInstance } from "../battle/factory"
import { getSpecies } from "./species"
import { typeEffectiveness } from "../battle/typeChart"
import { baseSpeciesOf, speciesAtLevel } from "./ace"
import type { MonInstance, PokeType } from "../battle/types"

// Équipe de test : 4 Daemons (pour exercer first3 / last3).
function team(): MonInstance[] {
    return [
        createMonInstance("feuillichot", 12), // PLANTE
        createMonInstance("gouttiny", 14),    // EAU
        createMonInstance("braisille", 16),   // FEU
        createMonInstance("rochison", 40),    // ROCHE/SOL (finale)
    ]
}

const isSuperEffVs = (counterId: string, victimTypes: PokeType[]) =>
    (getSpecies(counterId)?.types ?? []).some((t) => typeEffectiveness(t, victimTypes) > 1)

describe("sbire du dieu Spaghetti — 6 combats/jour", () => {
    it("plafonne désormais à 6 combats par jour", () => {
        expect(SBIRE_MAX_FIGHTS_PER_DAY).toBe(6)
    })

    it("combat 1 (index 0) = MIROIR du lead (même espèce, même niveau)", () => {
        const t = buildSbireTeam(team(), 0)
        expect(t).toHaveLength(1)
        expect(t[0].speciesId).toBe("feuillichot")
        expect(t[0].level).toBe(12)
    })

    it("combat 2 (index 1) = FAIBLESSE du lead, à niveau équivalent", () => {
        const t = buildSbireTeam(team(), 1)
        expect(t).toHaveLength(1)
        expect(t[0].level).toBe(12)
        expect(isSuperEffVs(t[0].speciesId, getSpecies("feuillichot")!.types)).toBe(true)
    })

    it("combat 3 (index 2) = MIROIR des 3 premiers", () => {
        const t = buildSbireTeam(team(), 2)
        expect(t).toHaveLength(3)
        expect(t.map((m) => m.speciesId)).toEqual(["feuillichot", "gouttiny", "braisille"])
        expect(t.map((m) => m.level)).toEqual([12, 14, 16])
    })

    it("combat 4 (index 3) = FAIBLESSE des 3 premiers (chacun super-efficace)", () => {
        const t = buildSbireTeam(team(), 3)
        expect(t).toHaveLength(3)
        const victims = [getSpecies("feuillichot")!.types, getSpecies("gouttiny")!.types, getSpecies("braisille")!.types]
        t.forEach((m, i) => expect(isSuperEffVs(m.speciesId, victims[i])).toBe(true))
    })

    it("combat 5 (index 4) = MIROIR + FAIBLESSE des 3 derniers (6 Daemons)", () => {
        const t = buildSbireTeam(team(), 4)
        expect(t).toHaveLength(6) // 3 miroirs + 3 contres
    })

    it("combat 6 (index 5) = la MÊME équipe que le combat 5, mais +2 niveaux", () => {
        const c5 = buildSbireTeam(team(), 4)
        const c6 = buildSbireTeam(team(), 5)
        expect(c6).toHaveLength(c5.length)
        // Chaque Daemon : niveau +2.
        c6.forEach((m, i) => expect(m.level).toBe(c5[i].level + 2))
        // Les 3 MIROIRS (indices 0-2) gardent l'espèce exacte (copie de ton équipe, n'évoluent pas) ;
        // les 3 CONTRES (indices 3-5) peuvent franchir un palier d'évo avec +2 niveaux (normal).
        expect(c6.slice(0, 3).map((m) => m.speciesId)).toEqual(c5.slice(0, 3).map((m) => m.speciesId))
    })

    it("à BAS NIVEAU, aucun Daemon du sbire n'est sur-évolué (régression : plus de Fissuralave niv 11)", () => {
        const low: MonInstance[] = [
            createMonInstance("feuillichot", 11), createMonInstance("gouttiny", 11),
            createMonInstance("braisille", 11), createMonInstance("plumiot", 11),
        ]
        for (let fi = 0; fi <= 5; fi++) {
            for (const m of buildSbireTeam(low, fi)) {
                expect(m.speciesId).toBe(speciesAtLevel(baseSpeciesOf(m.speciesId), m.level))
            }
        }
    })

    it("les conseils sont 1-indexés (tableaux de bulles) et cyclent sur le pool", () => {
        expect(sbireExplanation(1)).toEqual(SBIRE_TIPS[0])
        expect(sbireExplanation(SBIRE_TIPS.length)).toEqual(SBIRE_TIPS[SBIRE_TIPS.length - 1])
        expect(sbireExplanation(SBIRE_TIPS.length + 1)).toEqual(SBIRE_TIPS[0])
    })
})
