import { describe, it, expect, beforeEach } from "vitest"
import { applyServerSave, snapshot, startReplay, exitReplay } from "./saveManager"
import { getPlayer, getActiveWorld, getReplayRun, getReplayReturn } from "./playerStore"
import { getPokedex, markCaught } from "./pokedexStore"
import { emptySave, type YellowSave } from "../storage/save"
import type { MonInstance } from "../battle/types"

// REJEU (« run bis ») — Phase B : bulle ISOLÉE. Le monde réel doit rester INTACT pendant/après un rejeu ;
// le Pokédex global cumulatif garde les captures faites dans la bulle. Couche save = #1 risque → on la blinde.
function mon(uid: string, speciesId: string, level: number): MonInstance {
    return { uid, speciesId, level, exp: 0, ivs: { hp: 15, atk: 15, def: 15, spe: 15, spc: 15 }, currentHp: 1, status: "NONE", statusCounter: 0, moves: [{ moveId: "charge", pp: 35, ppMax: 35 }], owned: true }
}
function world(over: Partial<YellowSave>): YellowSave { return { ...emptySave(), ...over } }

// Charge un monde LIVE réaliste (joueur post-run 3 fusionné : progression complète) avant chaque test.
beforeEach(() => {
    applyServerSave(world({
        team: [mon("real-a", "cerfeuillu", 63), mon("real-b", "pyrokoss", 55)],
        badges: ["feu", "eau", "plante", "roche", "elec"],
        pokedex: { seen: ["cerfeuillu", "pyrokoss"], caught: ["cerfeuillu", "pyrokoss"] },
        reps: 800, repsCap: 2000, isChampion: true, ngplusUsed: true, run3Used: true, activeWorld: "live",
    }))
})

describe("REJEU — bulle isolée (stash/restore)", () => {
    it("startReplay(run1) : bulle FRAÎCHE, monde réel stashé, contexte posé", async () => {
        await startReplay("run1")
        expect(getActiveWorld()).toBe("replay")
        expect(getReplayRun()).toBe("run1")
        expect(getReplayReturn()).toBe("live")
        expect(getPlayer().team).toHaveLength(0)   // run 1 frais = intro (équipe vide)
        expect(getPlayer().badges).toHaveLength(0)
    })

    it("snapshot pendant le rejeu : champs plats = monde RÉEL (garde-fou), bulle dans replayWorld", async () => {
        await startReplay("run1")
        const snap = snapshot()
        expect(snap.activeWorld).toBe("replay")
        expect(snap.replayRun).toBe("run1")
        expect(snap.replayReturn).toBe("live")
        expect(snap.replayWorld).not.toBeNull()
        // Champs PLATS = monde réel (anti-wipe) : badges + équipe réels préservés malgré la bulle active.
        expect(snap.badges).toEqual(expect.arrayContaining(["feu", "elec"]))
        expect(snap.team.map((m) => m.uid)).toContain("real-a")
        expect(snap.replayWorld?.team).toHaveLength(0) // la bulle = fraîche
    })

    it("refresh mid-rejeu : applyServerSave(snapshot) → toujours en rejeu, captures conservées", async () => {
        await startReplay("run1")
        markCaught("razmaree") // capture DANS la bulle → Pokédex global
        applyServerSave(snapshot())
        expect(getActiveWorld()).toBe("replay")
        expect(getReplayReturn()).toBe("live")
        expect(getPlayer().team).toHaveLength(0) // toujours la bulle
        expect(getPokedex().caught).toContain("razmaree")
        expect(getPokedex().caught).toContain("cerfeuillu")
    })

    it("exitReplay : monde réel restauré INTACT + captures du rejeu GARDÉES (Pokédex global)", async () => {
        await startReplay("run1")
        markCaught("razmaree") // capture pendant le rejeu
        await exitReplay()
        expect(getActiveWorld()).toBe("live")
        expect(getReplayRun()).toBeNull()
        expect(getPlayer().team.map((m) => m.uid)).toEqual(["real-a", "real-b"]) // équipe réelle restaurée
        expect(getPlayer().badges).toEqual(expect.arrayContaining(["feu", "elec"]))
        expect(getPlayer().reps).toBe(800) // reps réels restaurés
        expect(getPokedex().caught).toContain("razmaree") // capture du rejeu conservée
        expect(getPokedex().caught).toContain("cerfeuillu")
    })

    it("startReplay(run3) SANS starter → refusé, monde réel inchangé", async () => {
        const ok = await startReplay("run3")
        expect(ok).toBe(false)
        expect(getActiveWorld()).toBe("live")
        expect(getPlayer().team.map((m) => m.uid)).toEqual(["real-a", "real-b"])
    })

    it("startReplay(run3) avec starter : énergie 500 (source unique), équipe = starter", async () => {
        const ok = await startReplay("run3", mon("s", "cornaive", 5))
        expect(ok).toBe(true)
        expect(getActiveWorld()).toBe("replay")
        expect(getReplayRun()).toBe("run3")
        expect(getPlayer().reps).toBe(500)
        expect(getPlayer().team.map((m) => m.speciesId)).toContain("cornaive")
    })

    it("run3 replay : les crédits normaux sont BLOQUÉS (source unique) même dans la bulle", async () => {
        const { grantReps } = await import("./playerStore")
        await startReplay("run3", mon("s", "cornaive", 5))
        const before = getPlayer().reps
        expect(grantReps(300)).toBe(0) // sans force → bloqué (règles run 3 via runMode)
        expect(getPlayer().reps).toBe(before)
    })

    it("run1 replay : la bulle démarre AVEC de l'énergie (report des reps réels + cadeaux), pas à 0", async () => {
        // Le monde réel a reps=800 (beforeEach) → la bulle run 1 doit être jouable dès le départ (fix revue #3).
        await startReplay("run1")
        expect(getActiveWorld()).toBe("replay")
        expect(getPlayer().reps).toBeGreaterThan(0)
    })

    it("double rejeu impossible : startReplay pendant un rejeu → false", async () => {
        await startReplay("run1")
        const ok = await startReplay("run1")
        expect(ok).toBe(false)
        expect(getActiveWorld()).toBe("replay")
    })
})
