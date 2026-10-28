import { describe, it, expect } from "vitest"
import { applyServerSave } from "./saveManager"
import { getPlayer, applyExternalEffects } from "./playerStore"
import { emptySave } from "../storage/save"
import { createMonInstance } from "../battle/factory"
import { isKnownGenieEffectKind } from "../data/genieLamp"

// Incident du 28/10/2026 : DaKumba est sorti de son rejeu du run 3 avec un onglet chargé AVANT la nouvelle règle de sortie ;
// son Magnetor ✨ et un 6e Daemon ne sont pas revenus. Effet « give_mon » : un Daemon NEUF à son nom, livré une seule fois
// par le canal des effets en attente (pendingEffects, acquitté par compare-and-swap).
const fx = (effects: object[]) => JSON.stringify(effects)

describe("effet give_mon : rendre un Daemon", () => {
    it("ajoute le Daemon demandé (espèce, niveau, shiny) au PC si l'équipe est pleine, une seule fois par lot", () => {
        const team = ["feuillichot", "plumiot", "couperin", "pampousse", "cailloutchi", "ruffiant"].map((id) => createMonInstance(id, 20))
        applyServerSave({ ...emptySave(), reps: 100, repsCap: 5000, repsBankedTotal: 0, team, geniePaid: [] })
        const batch = fx([{ kind: "give_mon", id: "magnetor", level: 60, shiny: true, tag: "test-restitution-magnetor" }])
        expect(isKnownGenieEffectKind("give_mon")).toBe(true)
        expect(applyExternalEffects(batch)).toBe(true)
        const got = getPlayer().pc.filter((m) => m.speciesId === "magnetor")
        expect(got).toHaveLength(1)
        expect(got[0].level).toBe(60)
        expect(got[0].shiny).toBe(true)
        expect(got[0].owned).toBe(true)
        expect(applyExternalEffects(batch)).toBe(true) // déjà reçu : pas de second Magnetor
        expect(getPlayer().pc.filter((m) => m.speciesId === "magnetor")).toHaveLength(1)
    })
    it("une espèce inconnue n'est pas versée", () => {
        applyServerSave({ ...emptySave(), reps: 100, repsCap: 5000, repsBankedTotal: 0, team: [createMonInstance("feuillichot", 12)], geniePaid: [] })
        applyExternalEffects(fx([{ kind: "give_mon", id: "espece_inexistante", level: 30, tag: "test-inconnue" }]))
        expect([...getPlayer().team, ...getPlayer().pc].some((m) => m.speciesId === "espece_inexistante")).toBe(false)
    })
})
