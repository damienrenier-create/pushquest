import { describe, it, expect } from "vitest"
import { applyServerSave, snapshot } from "./saveManager"
import { getPlayer, hydratePlayer, startNgPlusWorld, markGenieArcSeen, isGenieArcSeen } from "./playerStore"
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

describe("genieArcSeen — 1 génie par PROFIL (pas par run)", () => {
    it("marqué → carry à travers le run 2 (global au profil)", () => {
        hydratePlayer({ reps: 0, repsCap: 1000, defeatedTrainers: [], items: {}, team: [], pc: [] })
        markGenieArcSeen()
        expect(isGenieArcSeen()).toBe(true)
        startNgPlusWorld(createMonInstance("razmaree", 5, { owned: true }))
        expect(isGenieArcSeen()).toBe(true) // survit à la bascule run 2 → le génie ne repop pas
    })
    it("survit au round-trip save + frais pour un profil neuf (emptySave)", () => {
        applyServerSave({ ...emptySave(), activeWorld: "live", genieArcSeen: true })
        expect(isGenieArcSeen()).toBe(true)
        applyServerSave(parseSave(JSON.parse(JSON.stringify(snapshot()))))
        expect(isGenieArcSeen()).toBe(true)
        applyServerSave({ ...emptySave(), activeWorld: "live" }) // nouveau profil → frais
        expect(isGenieArcSeen()).toBe(false)
    })
})
