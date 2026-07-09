import { describe, it, expect } from "vitest"
import { run3ArenaEnergy, RUN3_ARENA_ENERGY, RUN3_ARENAS, RUN3_ARENA_BADGES, run3ArenaForBoss, pickRun3ArenaBosses, type ArenaChampionRow } from "./run3Arenas"

const SLOTS = ["feu", "plante", "eau", "roche", "elec"] as const

describe("RUN 3 — config des 5 arènes (ordre/badge/type)", () => {
    it("5 arènes dans l'ordre de jeu, badges = slots ArenaChampion, types Ligue", () => {
        expect(RUN3_ARENAS.map((a) => a.badge)).toEqual(["plante", "roche", "feu", "elec", "eau"])
        expect(RUN3_ARENA_BADGES).toEqual(["plante", "roche", "feu", "elec", "eau"])
        expect(RUN3_ARENAS.map((a) => a.guardType)).toEqual(["Glace", "Combat", "Poison/Spectre", "Dragon", "Multi"])
        expect(RUN3_ARENAS.map((a) => a.order)).toEqual([1, 2, 3, 4, 5])
    })
    it("chaque arène connaît son palier d'énergie (cohérent avec RUN3_ARENA_ENERGY)", () => {
        expect(RUN3_ARENAS.map((a) => a.energy)).toEqual([...RUN3_ARENA_ENERGY])
        expect(RUN3_ARENAS.map((a) => a.energy)).toEqual([700, 900, 1100, 1300, 1500])
    })
    it("run3ArenaForBoss : retrouve l'arène par son boss ; null si inconnu", () => {
        expect(run3ArenaForBoss("y_feuarena_boss")?.guardType).toBe("Poison/Spectre")
        expect(run3ArenaForBoss("y_arena_druide")?.energy).toBe(700)
        expect(run3ArenaForBoss("inconnu")).toBeNull()
    })
})

describe("RUN 3 — paliers d'énergie d'arène", () => {
    it("700 → 1500 par arène (index 0..4), 0 hors bornes", () => {
        expect(RUN3_ARENA_ENERGY).toEqual([700, 900, 1100, 1300, 1500])
        expect(run3ArenaEnergy(0)).toBe(700)
        expect(run3ArenaEnergy(4)).toBe(1500)
        expect(run3ArenaEnergy(5)).toBe(0)
        expect(run3ArenaEnergy(-1)).toBe(0)
    })
})

describe("RUN 3 — sélection des boss (vraies équipes de joueurs)", () => {
    const ch = (nickname: string, badgeId: string): ArenaChampionRow => ({ nickname, badgeId, team: [`${nickname}-team`] })

    it("5 joueurs distincts (un par arène) → 5 boss distincts", () => {
        const champions = [ch("Gg", "feu"), ch("Mools", "plante"), ch("Xa", "eau"), ch("Embi", "roche"), ch("Milka", "elec")]
        const bosses = pickRun3ArenaBosses(champions, SLOTS)
        expect(bosses.map((b) => b?.nickname)).toEqual(["Gg", "Mools", "Xa", "Embi", "Milka"])
        expect(new Set(bosses.map((b) => b?.nickname)).size).toBe(5) // tous distincts
    })

    it("run 1 + run 2 MÉLANGÉS : un champion 'ngplus:feu' est éligible au slot 'feu'", () => {
        const champions = [ch("Neuneu", "ngplus:feu"), ch("Franss", "ngplus:eau")]
        const bosses = pickRun3ArenaBosses(champions, SLOTS)
        expect(bosses[0]?.nickname).toBe("Neuneu") // slot feu ← run 2 (ngplus:feu)
        expect(bosses[2]?.nickname).toBe("Franss") // slot eau ← run 2
        expect(bosses[1]).toBeNull()               // plante : aucun champion
    })

    it("vivier trop petit : DOUBLON toléré (jamais de trou si ≥1 candidat)", () => {
        // Un seul joueur a battu TOUTES les arènes → il est boss partout (doublon assumé).
        const solo = SLOTS.map((s) => ch("Mools", s))
        const bosses = pickRun3ArenaBosses(solo, SLOTS)
        expect(bosses.every((b) => b?.nickname === "Mools")).toBe(true)
    })

    it("préfère les joueurs frais avant de doubler", () => {
        // slot feu : Gg + Mools ; slot plante : seulement Mools. Attendu : feu→Gg (frais gardé pour + tard),
        // plante→Mools. Le seed 0 prendrait feu→Gg (index 0), donc Mools reste dispo pour plante.
        const champions = [ch("Gg", "feu"), ch("Mools", "feu"), ch("Mools", "plante")]
        const bosses = pickRun3ArenaBosses(champions, ["feu", "plante"])
        expect(bosses[0]?.nickname).toBe("Gg")
        expect(bosses[1]?.nickname).toBe("Mools")
    })

    it("slot sans aucun champion → null", () => {
        expect(pickRun3ArenaBosses([], SLOTS).every((b) => b === null)).toBe(true)
    })

    it("déterministe : même entrée + même seed → même résultat", () => {
        const champions = [ch("A", "feu"), ch("B", "feu"), ch("C", "feu")]
        const r1 = pickRun3ArenaBosses(champions, ["feu"], 2)
        const r2 = pickRun3ArenaBosses(champions, ["feu"], 2)
        expect(r1[0]?.nickname).toBe(r2[0]?.nickname)
    })
})
