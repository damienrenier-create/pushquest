import { describe, it, expect } from "vitest"
import { chooseAiAction, chooseReplacementIndex } from "./ai"
import { toBattleMon } from "./engine"
import { createMonInstance } from "./factory"
import { Rng } from "./rng"
import { buildHubTeam, type RegistryPlayer } from "../data/playerArena"

// PILOTE IA de TONYTONY (mur spécial de Mools : PV 250 / DÉF 5 / SPC 105). Stratégie : Mirage (esquive) pour survivre
// aux physiques qui l'OHKO, Éveil Divin (dégâts + Spé) pour snowballer, Repos quand c'est sûr. NE SORT JAMAIS de
// lui-même. GARDE-FOU d'entrée : n'entre qu'une fois les attaquants physiques adverses KO. Moves imposés :
// index 0 = eveil_divin, 1 = mirage, 2 = repos.
const mon = (id: string, lvl: number, moves: string[]) => toBattleMon(createMonInstance(id, lvl, { moveIds: moves, owned: false }))
const T_MOVES = ["eveil_divin", "mirage", "repos"]
const PHYS = "maitrezenc"   // COMBAT : atk 118 > spc 68 → menace physique
const SPEC = "divinpate"    // PSY : spc 120 > atk 68 → attaquant spécial

describe("Tonytony — pilote de coup", () => {
    it("face à un attaquant PHYSIQUE en pleine forme : monte l'esquive (Mirage)", () => {
        const self = mon("tonytony", 60, T_MOVES)
        const foe = mon(PHYS, 60, ["charge"]); foe.currentHp = 9999 // pas de KO possible → on teste bien Mirage
        expect(chooseAiAction(self, foe, [self], 0, "hof", new Rng(1))).toEqual({ kind: "move", moveIndex: 1 })
    })
    it("face à un attaquant SPÉCIAL (qu'il mure) : snowball Éveil Divin (pas de Mirage)", () => {
        const self = mon("tonytony", 60, T_MOVES)
        const foe = mon(SPEC, 60, ["charge"]); foe.currentHp = 9999
        expect(chooseAiAction(self, foe, [self], 0, "hof", new Rng(1))).toEqual({ kind: "move", moveIndex: 0 })
    })
    it("si Éveil Divin met KO ce tour, il FRAPPE (prime sur Mirage même face à un physique)", () => {
        const self = mon("tonytony", 60, T_MOVES)
        const foe = mon(PHYS, 60, ["charge"]); foe.currentHp = 1
        expect(chooseAiAction(self, foe, [self], 0, "hof", new Rng(1))).toEqual({ kind: "move", moveIndex: 0 })
    })
    it("esquive PLAFONNÉE à +6 : ne spamme pas Mirage au plafond (repasse à Éveil Divin)", () => {
        const self = mon("tonytony", 60, T_MOVES); self.stages.eva = 6
        const foe = mon(PHYS, 60, ["charge"]); foe.currentHp = 9999
        expect(chooseAiAction(self, foe, [self], 0, "hof", new Rng(1))).toEqual({ kind: "move", moveIndex: 0 })
    })
    it("PV bas face à un spécial (qu'il mure) : se soigne (Repos)", () => {
        const self = mon("tonytony", 60, T_MOVES); self.currentHp = 40 // frac < 0.5
        const foe = mon(SPEC, 60, ["charge"]); foe.currentHp = 9999
        expect(chooseAiAction(self, foe, [self], 0, "hof", new Rng(1))).toEqual({ kind: "move", moveIndex: 2 })
    })
    it("ne CHANGE JAMAIS de Daemon de lui-même (reste en jeu)", () => {
        const self = mon("tonytony", 60, T_MOVES)
        const bench = mon("razmaree", 60, ["charge"])
        const foe = mon(PHYS, 60, ["charge"]); foe.currentHp = 9999
        for (let s = 0; s < 30; s++) expect(chooseAiAction(self, foe, [self, bench], 0, "hof", new Rng(s + 1)).kind).toBe("move")
    })
})

describe("Tonytony — garde-fou d'ENTRÉE (chooseReplacementIndex)", () => {
    const foe = mon(SPEC, 60, ["charge"]) // actif adverse = spécial
    it("tant qu'un attaquant PHYSIQUE adverse est vivant : n'envoie PAS Tonytony (préfère un autre)", () => {
        const bench = [mon("tonytony", 60, T_MOVES), mon("razmaree", 60, ["repos"])]
        const foeTeam = [foe, mon(PHYS, 60, ["charge"])] // maitrezenc vivant
        expect(chooseReplacementIndex(bench, foe, foeTeam)).toBe(1) // razmaree, PAS Tonytony (index 0)
    })
    it("mais l'envoie quand même s'il est le SEUL Daemon vivant (ne bloque pas l'IA)", () => {
        const bench = [mon("tonytony", 60, T_MOVES)]
        const foeTeam = [foe, mon(PHYS, 60, ["charge"])]
        expect(chooseReplacementIndex(bench, foe, foeTeam)).toBe(0)
    })
    it("une fois les physiques adverses KO : Tonytony redevient éligible", () => {
        const bench = [mon("tonytony", 60, T_MOVES), mon("razmaree", 60, ["repos"])]
        const koPhys = mon(PHYS, 60, ["charge"]); koPhys.currentHp = 0 // physique éliminé
        const foeTeam = [foe, koPhys]
        expect(chooseReplacementIndex(bench, foe, foeTeam)).toBe(0) // Tonytony (meilleur score offensif) n'est plus pénalisé
    })
})

describe("Tonytony — ordre d'équipe (buildHubTeam)", () => {
    const player = (team: { speciesId: string; level: number; nickname: string | null }[], fav?: string): RegistryPlayer =>
        ({ userId: "u", nickname: "Mools", team, favoriteDaemon: fav })
    it("n'OUVRE jamais le combat, même s'il est le Daemon fétiche (renvoyé en fin d'ordre)", () => {
        const t = buildHubTeam(player([
            { speciesId: "tonytony", level: 60, nickname: null },
            { speciesId: "razmaree", level: 60, nickname: null },
        ], "tonytony"))
        expect(t[0].speciesId).toBe("razmaree")
        expect(t[t.length - 1].speciesId).toBe("tonytony")
    })
    it("mène quand même s'il est SEUL", () => {
        const t = buildHubTeam(player([{ speciesId: "tonytony", level: 60, nickname: null }]))
        expect(t[0].speciesId).toBe("tonytony")
    })
})
