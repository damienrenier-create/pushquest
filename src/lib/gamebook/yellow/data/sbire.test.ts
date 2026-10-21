import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { buildSbireTeam, sbireExplanation, SBIRE_MAX_FIGHTS_PER_DAY, SBIRE_TIPS, SBIRE_CLAN_TIPS, SBIRE_TIPS_FUN, SBIRE_CLAN_TIPS_FUN } from "./sbire"
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

    it("les conseils cyclent sur le pool + AJOUTENT un conseil CLAN en dernière bulle", () => {
        // Le conseil régulier reste en tête (mêmes bulles), un conseil CLAN est ajouté à la fin.
        expect(sbireExplanation(1).slice(0, SBIRE_TIPS[0].length)).toEqual(SBIRE_TIPS[0])
        expect(sbireExplanation(1).at(-1)).toBe(SBIRE_CLAN_TIPS[0])
        // Cycle du pool régulier (le +1 revient au tout premier conseil).
        expect(sbireExplanation(SBIRE_TIPS.length + 1).slice(0, SBIRE_TIPS[0].length)).toEqual(SBIRE_TIPS[0])
        // Chaque conseil se termine par une bulle clan (🍝).
        expect(sbireExplanation(3).at(-1)).toContain("🍝")
    })
})

// Signalé par Sartay le 20/10/2026 : en mode fun, le sbire parlait encore de pompes, de quota et de reps de la vraie vie.
const NOT_FOR_FUN = /pompe|squat|quota|amende|vraie vie|dehors|encod|séance|(?<!\p{L})reps?(?!\p{L})/iu // limites de mot Unicode : « Repère » n’est pas « reps »
describe("sbire — conseils du mode FUN", () => {
    it("⚠️ aucun conseil fun ne parle de pompes, de squats, de quota, d'amende ni de reps de la vraie vie", () => {
        for (const tip of SBIRE_TIPS_FUN) for (const line of tip) expect(line).not.toMatch(NOT_FOR_FUN)
        for (const line of SBIRE_CLAN_TIPS_FUN) expect(line).not.toMatch(NOT_FOR_FUN)
    })
    it("même nombre de conseils et même ordre : le cycle reste aligné", () => {
        expect(SBIRE_TIPS_FUN.length).toBe(SBIRE_TIPS.length)
        expect(SBIRE_CLAN_TIPS_FUN.length).toBe(SBIRE_CLAN_TIPS.length)
        expect(SBIRE_TIPS_FUN[13]).toEqual(SBIRE_TIPS[13]) // un conseil sans rapport avec les reps est gardé tel quel
    })
    it("sbireExplanation(n, true) puise dans les conseils fun, sbireExplanation(n) dans les conseils classiques", () => {
        expect(sbireExplanation(1, true).slice(0, SBIRE_TIPS_FUN[0].length)).toEqual(SBIRE_TIPS_FUN[0])
        expect(sbireExplanation(1).slice(0, SBIRE_TIPS[0].length)).toEqual(SBIRE_TIPS[0])
        expect(sbireExplanation(6, true).at(-1)).toBe(SBIRE_CLAN_TIPS_FUN[5])
    })
    it("le conseil d'arène parle des SIX arènes, dont le bateau (plus de « trois salles »)", () => {
        expect(SBIRE_TIPS.flat().join(" ")).not.toContain("Trois salles")
        expect(SBIRE_TIPS.flat().join(" ")).toContain("Six arènes")
        expect(SBIRE_TIPS_FUN.flat().join(" ")).toContain("Six arènes")
    })
    it("le client passe le mode de jeu au sbire", () => {
        const ui = fs.readFileSync(path.join(process.cwd(), "src/app/gamebook/yellow/YellowDevClient.tsx"), "utf8")
        expect(ui).toContain("sbireExplanation(sbireWin, getGameMode() === \"fun\")")
    })
})
