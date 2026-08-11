import { describe, it, expect, beforeEach } from "vitest"
import { applyServerSave, startReplay, exitReplay } from "./saveManager"
import { getPlayer, getActiveWorld } from "./playerStore"
import { emptySave, type YellowSave } from "../storage/save"
import type { MonInstance } from "../battle/types"

// REJEU RUN 2 — ADDITIF : recommence un run 2 complet (starter perso niv 5 + 1000⚡), et à la sortie les Daemons de
// la bulle (équipe + captures) REJOIGNENT le PC du monde réel (non-destructif : rien n'est écrasé). ≠ run1/run3 (isolés).
function mon(uid: string, speciesId: string, level: number): MonInstance {
    return { uid, speciesId, level, exp: 0, ivs: { hp: 15, atk: 15, def: 15, spe: 15, spc: 15 }, currentHp: 1, status: "NONE", statusCounter: 0, moves: [{ moveId: "charge", pp: 35, ppMax: 35 }], owned: true }
}
const world = (over: Partial<YellowSave>): YellowSave => ({ ...emptySave(), ...over })

describe("Rejeu RUN 2 — additif (Daemons de la bulle → PC réel)", () => {
    beforeEach(() => {
        applyServerSave(world({
            team: [mon("real-a", "cerfeuillu", 63)],
            pc: [mon("real-pc", "pyrokoss", 55)],
            badges: ["feu"], activeWorld: "live", ngplusUsed: true, run3Used: true,
            reps: 500, repsCap: 2000, ngplusStarterBase: "gavillus",
        }))
    })

    it("démarre avec le starter + 1000⚡ ; à la sortie, le Daemon de la bulle est AJOUTÉ au PC réel (réel préservé)", async () => {
        const ok = await startReplay("run2", mon("s", "gavillus", 5))
        expect(ok).toBe(true)
        expect(getActiveWorld()).toBe("replay")
        expect(getPlayer().reps).toBe(1000)                              // 1000⚡ (≠ NG+ 10000)
        expect(getPlayer().team.map((m) => m.speciesId)).toEqual(["gavillus"]) // équipe = starter niv 5

        await exitReplay()
        expect(getActiveWorld()).toBe("live")
        const pc = getPlayer().pc.map((m) => m.speciesId)
        expect(pc).toContain("pyrokoss")   // ANCIEN PC réel préservé (non-destructif)
        expect(pc).toContain("gavillus")   // Daemon de la bulle AJOUTÉ (additif)
        expect(getPlayer().team.map((m) => m.speciesId)).toEqual(["cerfeuillu"]) // équipe réelle restaurée
    })

    it("le rejeu RUN 1 reste ISOLÉ (bulle jetée, aucun ajout au PC réel)", async () => {
        const before = getPlayer().pc.length
        await startReplay("run1")
        await exitReplay()
        expect(getPlayer().pc.length).toBe(before)
    })
})
