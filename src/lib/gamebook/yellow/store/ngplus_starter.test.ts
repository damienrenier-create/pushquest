import { describe, it, expect } from "vitest"
import { applyServerSave, snapshot } from "./saveManager"
import { getPlayer, hydratePlayer, startNgPlusWorld } from "./playerStore"
import { emptySave, parseSave, type YellowSave } from "../storage/save"
import { createMonInstance } from "../battle/factory"

// ngplusStarterBase : mémorise l'espèce du STARTER du run 2 (Daemon perso du NG+) → permet de REJOUER le run 2 avec
// lui même si la création a été CANONISÉE (customDaemons alors vide). Global (survit aux bascules de monde + save).
describe("ngplusStarterBase — starter run 2 mémorisé", () => {
    it("startNgPlusWorld pose ngplusStarterBase = species du starter", () => {
        hydratePlayer({ reps: 0, repsCap: 1000, defeatedTrainers: [], items: {}, team: [], pc: [] })
        startNgPlusWorld(createMonInstance("razmaree", 5, { owned: true }))
        expect(getPlayer().ngplusStarterBase).toBe("razmaree")
    })

    it("survit à un round-trip save (snapshot → parseSave → applyServerSave)", () => {
        const world: YellowSave = { ...emptySave(), activeWorld: "live", ngplusStarterBase: "gavillus" }
        applyServerSave(world)
        expect(getPlayer().ngplusStarterBase).toBe("gavillus")
        applyServerSave(parseSave(JSON.parse(JSON.stringify(snapshot()))))
        expect(getPlayer().ngplusStarterBase).toBe("gavillus") // toujours là après un cycle DB complet
    })
})
