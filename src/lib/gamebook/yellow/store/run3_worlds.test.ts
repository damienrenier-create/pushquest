import { describe, it, expect, beforeEach } from "vitest"
import { applyServerSave, snapshot, mergeWorlds } from "./saveManager"
import { getActiveWorld } from "./playerStore"
import { getPokedex, markCaught } from "./pokedexStore"
import { emptySave, parseSave, type YellowSave } from "../storage/save"
import type { MonInstance } from "../battle/types"

function mon(uid: string, speciesId: string, level: number): MonInstance {
    return { uid, speciesId, level, exp: 0, ivs: { hp: 15, atk: 15, def: 15, spe: 15, spc: 15 }, currentHp: 1, status: "NONE", statusCounter: 0, moves: [{ moveId: "charge", pp: 35, ppMax: 35 }], owned: true }
}
function world(over: Partial<YellowSave>): YellowSave {
    return { ...emptySave(), ...over }
}

// ─────────────────────────────────────────────────────────────────────────────
// SÉRIALISATION 3 MONDES (ce qui va réellement en DB) — le plus critique.
// ─────────────────────────────────────────────────────────────────────────────
describe("save.ts — sérialisation des 3 mondes (round-trip DB)", () => {
    it("run3World + run3Used + activeWorld='run3' sont préservés au parse ; récursion bornée à 1", () => {
        const run2 = world({ team: [mon("r2", "razmaree", 50)], badges: ["ngplus:feu"] })
        const run3 = world({ team: [mon("r3", "magnetor", 60)], reps: 480 })
        const top = world({ team: [mon("r1", "cerfeuillu", 63)], activeWorld: "run3", ngplusWorld: run2, run3World: run3, run3Used: true, ngplusUsed: true })
        const parsed = parseSave(JSON.parse(JSON.stringify(top)))
        expect(parsed.activeWorld).toBe("run3")
        expect(parsed.run3Used).toBe(true)
        expect(parsed.run3World?.team[0].speciesId).toBe("magnetor")
        expect(parsed.run3World?.reps).toBe(480)
        expect(parsed.ngplusWorld?.team[0].speciesId).toBe("razmaree")
        // Un monde imbriqué ne porte AUCUN sous-monde (profondeur bornée à 1 → jamais de récursion infinie).
        expect(parsed.run3World?.ngplusWorld).toBeNull()
        expect(parsed.run3World?.run3World).toBeNull()
        expect(parsed.ngplusWorld?.run3World).toBeNull()
    })
    it("ancienne save 2-mondes : run3World=null, run3Used=false (additif, aucun effet)", () => {
        const parsed = parseSave({ team: [], activeWorld: "ngplus", ngplusWorld: { team: [] } })
        expect(parsed.run3World).toBeNull()
        expect(parsed.run3Used).toBe(false)
        expect(parsed.activeWorld).toBe("ngplus") // le run 2 existant n'est pas cassé
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// ASSEMBLAGE / ROUND-TRIP DES 3 MONDES (garde-fou anti-wipe).
// ─────────────────────────────────────────────────────────────────────────────
describe("saveManager — assemblage des 3 mondes (snapshot)", () => {
    beforeEach(() => { applyServerSave(emptySave()) }) // reset de l'état mondes entre les tests

    it("charger une save run 3 → snapshot() reproduit les 3 mondes ; les CHAMPS PLATS = run 1 (garde-fou)", () => {
        const run2 = world({ team: [mon("r2", "razmaree", 50)], badges: ["ngplus:feu"], ngplusUsed: true })
        const run3 = world({ team: [mon("r3", "magnetor", 60)], reps: 480, badges: ["run3:glace"], run3Used: true, ngplusUsed: true })
        const top = world({ team: [mon("r1", "cerfeuillu", 63)], badges: ["feu", "eau"], activeWorld: "run3", ngplusWorld: run2, run3World: run3, run3Used: true, ngplusUsed: true })
        applyServerSave(top)
        expect(getActiveWorld()).toBe("run3")

        const snap = snapshot()
        // CHAMPS PLATS = run 1 (garde-fou anti-wipe) — JAMAIS le monde run 3 actif.
        expect(snap.team[0].speciesId).toBe("cerfeuillu")
        expect(snap.badges.sort()).toEqual(["eau", "feu"])
        // Les 3 mondes sont bien tous là.
        expect(snap.activeWorld).toBe("run3")
        expect(snap.ngplusWorld?.team[0].speciesId).toBe("razmaree")
        expect(snap.run3World?.team[0].speciesId).toBe("magnetor")
        expect(snap.run3World?.reps).toBe(480)
        // Le monde actif (run 3) a bien reçu ses 480⚡ dans les stores → re-sérialisé correctement.
        expect(snap.run3World?.badges).toEqual(["run3:glace"])
    })

    it("dégradation : activeWorld='run3' mais run3World absent → retombe sur 'live' (anti-écran noir)", () => {
        applyServerSave(world({ team: [mon("r1", "cerfeuillu", 63)], activeWorld: "run3", run3World: null }))
        expect(getActiveWorld()).toBe("live")
        expect(snapshot().team[0].speciesId).toBe("cerfeuillu")
    })

    it("save 2-mondes classique (live actif + run 2 stashé) : snapshot inchangé, run3World=null", () => {
        const run2 = world({ team: [mon("r2", "razmaree", 50)], ngplusUsed: true })
        applyServerSave(world({ team: [mon("r1", "cerfeuillu", 63)], activeWorld: "live", ngplusWorld: run2 }))
        expect(getActiveWorld()).toBe("live")
        const snap = snapshot()
        expect(snap.team[0].speciesId).toBe("cerfeuillu")
        expect(snap.ngplusWorld?.team[0].speciesId).toBe("razmaree")
        expect(snap.run3World).toBeNull()
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// FUSION 3-VOIES (le cœur de completeRun3).
// ─────────────────────────────────────────────────────────────────────────────
describe("run 3 — fusion 3-voies (run3 ⊕ run2 ⊕ run1)", () => {
    it("équipe = run 3, TOUS les Daemons versés au PC, Pokédex/badges/CT en union, un seul monde", () => {
        const run3 = world({ team: [mon("r3a", "magnetor", 70)], pc: [mon("r3pc", "pyrokoss", 40)], pokedex: { seen: ["x"], caught: ["x"] }, badges: ["run3:glace"], ownedCts: ["ctA"], run3Used: true, ngplusUsed: true, isChampion: true })
        const run2 = world({ team: [mon("r2a", "razmaree", 55)], pokedex: { seen: ["y"], caught: ["y"] }, badges: ["ngplus:feu"], ownedCts: ["ctB"] })
        const run1 = world({ team: [mon("r1a", "cerfeuillu", 63)], pokedex: { seen: ["z"], caught: ["z"] }, badges: ["feu"], ownedCts: ["ctC"] })

        // completeRun3 fait : mergeWorlds(mergeWorlds(run3, run2), run1)
        const merged = mergeWorlds(mergeWorlds(run3, run2), run1)

        expect(merged.team.map((m) => m.speciesId)).toEqual(["magnetor"]) // l'équipe du run 3 reste active
        const pcSpecies = merged.pc.map((m) => m.speciesId)
        expect(pcSpecies).toContain("pyrokoss")   // PC du run 3
        expect(pcSpecies).toContain("razmaree")   // équipe du run 2 récupérée
        expect(pcSpecies).toContain("cerfeuillu") // équipe du run 1 récupérée
        expect(merged.pokedex.caught.sort()).toEqual(["x", "y", "z"])
        expect(merged.badges.sort()).toEqual(["feu", "ngplus:feu", "run3:glace"])
        expect(merged.ownedCts.sort()).toEqual(["ctA", "ctB", "ctC"])
        expect(new Set(merged.pc.map((m) => m.uid)).size).toBe(merged.pc.length) // aucune collision d'uid
        expect(merged.activeWorld).toBe("live")
        expect(merged.ngplusWorld).toBeNull()
        expect(merged.run3World).toBeNull()
        expect(merged.isChampion).toBe(true)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// POKÉDEX GLOBAL — cumulatif d'un run à l'autre (ne se reset JAMAIS sur bascule de monde).
// ─────────────────────────────────────────────────────────────────────────────
describe("pokédex global (cumulatif, persiste run→run)", () => {
    beforeEach(() => { applyServerSave(emptySave()) })

    it("applyServerSave : le pokédex = UNION des pokédex des 3 mondes (migration douce, aucune capture perdue)", () => {
        const run2 = world({ team: [mon("r2", "razmaree", 50)], pokedex: { seen: ["b"], caught: ["b"] }, ngplusUsed: true })
        const run3 = world({ team: [mon("r3", "magnetor", 60)], pokedex: { seen: ["c"], caught: ["c"] }, run3Used: true, ngplusUsed: true })
        const top = world({ team: [mon("r1", "cerfeuillu", 63)], pokedex: { seen: ["a"], caught: ["a"] }, activeWorld: "run3", ngplusWorld: run2, run3World: run3, run3Used: true, ngplusUsed: true })
        applyServerSave(top)
        expect(getPokedex().caught.sort()).toEqual(["a", "b", "c"]) // union des 3 mondes divergents
    })

    it("snapshot : le pokédex global est écrit à l'IDENTIQUE dans TOUS les mondes", () => {
        const run2 = world({ team: [mon("r2", "razmaree", 50)], pokedex: { seen: [], caught: ["b"] }, ngplusUsed: true })
        const top = world({ team: [mon("r1", "cerfeuillu", 63)], pokedex: { seen: [], caught: ["a"] }, activeWorld: "live", ngplusWorld: run2, ngplusUsed: true })
        applyServerSave(top)   // pokédex global = {a, b}
        markCaught("d")        // nouvelle capture pendant la session
        const snap = snapshot()
        expect(snap.pokedex.caught.sort()).toEqual(["a", "b", "d"])              // monde live (champs plats)
        expect(snap.ngplusWorld?.pokedex.caught.sort()).toEqual(["a", "b", "d"]) // monde run 2 = MÊME set global
    })
})
