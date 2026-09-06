import { describe, it, expect, beforeEach } from "vitest"
import { hydratePlayer, getPlayer, startNgPlusWorld, startRun3World, reconcileCrossRunItems } from "../store/playerStore"
import { createMonInstance } from "../battle/factory"
import { LAMP_ITEM_ID } from "./genieLamp"
import { FISHING_ROD_ITEM_ID } from "./fishing"

// OBJETS CROSS-RUN : la lampe rouillée + la canne à pêche se REPORTENT d'un run à l'autre (gagnés 1 fois, gardés à vie).
// Le reste du sac est vidé à chaque nouveau run (comportement inchangé). Cf. carryCrossRunItems (playerStore).
describe("objets cross-run (lampe/canne) — report d'un run à l'autre", () => {
    beforeEach(() => hydratePlayer({ team: [], pc: [], items: {} }))

    it("NG+ : reporte lampe + canne, jette les objets ordinaires", () => {
        hydratePlayer({ team: [], pc: [], items: { [LAMP_ITEM_ID]: 1, [FISHING_ROD_ITEM_ID]: 1, poke_ball: 5, potion: 3 } })
        startNgPlusWorld(createMonInstance("blaziper", 5))
        const items = getPlayer().items
        expect(items[LAMP_ITEM_ID]).toBe(1)
        expect(items[FISHING_ROD_ITEM_ID]).toBe(1)
        expect(items.poke_ball ?? 0).toBe(0) // objet ordinaire → NON reporté
        expect(items.potion ?? 0).toBe(0)
    })

    it("RUN 3 : reporte la canne même sans lampe", () => {
        hydratePlayer({ team: [], pc: [], items: { [FISHING_ROD_ITEM_ID]: 1 } })
        startRun3World(createMonInstance("blaziper", 5))
        const items = getPlayer().items
        expect(items[FISHING_ROD_ITEM_ID]).toBe(1)
        expect(items[LAMP_ITEM_ID] ?? 0).toBe(0) // jamais gagnée → toujours absente
    })

    it("aucun objet-clé gagné → nouveau run démarre sac vide", () => {
        hydratePlayer({ team: [], pc: [], items: { poke_ball: 9 } })
        startNgPlusWorld(createMonInstance("blaziper", 5))
        expect(getPlayer().items[LAMP_ITEM_ID] ?? 0).toBe(0)
        expect(getPlayer().items[FISHING_ROD_ITEM_ID] ?? 0).toBe(0)
    })
})

// RATTRAPAGE au chargement (applyServerSave) : un objet-clé présent dans UN AUTRE monde est redéposé dans le monde ACTIF.
describe("reconcileCrossRunItems — rattrapage rétroactif au chargement", () => {
    it("lampe manquante dans le monde actif mais présente ailleurs → redéposée (cas Zyran)", () => {
        const active = { poke_ball: 3 }
        const out = reconcileCrossRunItems(active, [{ [LAMP_ITEM_ID]: 1, [FISHING_ROD_ITEM_ID]: 1 }, { poke_ball: 5 }])
        expect(out[LAMP_ITEM_ID]).toBe(1)
        expect(out[FISHING_ROD_ITEM_ID]).toBe(1)
        expect(out.poke_ball).toBe(3) // le reste intact
    })

    it("déjà présente dans le monde actif → identité (aucune modif)", () => {
        const active = { [LAMP_ITEM_ID]: 1, [FISHING_ROD_ITEM_ID]: 1 }
        const out = reconcileCrossRunItems(active, [{ [LAMP_ITEM_ID]: 1 }])
        expect(out).toBe(active) // même référence → pas de recréation inutile
    })

    it("aucun monde ne possède l'objet → rien ajouté", () => {
        const out = reconcileCrossRunItems({ poke_ball: 1 }, [{ poke_ball: 2 }, {}])
        expect(out[LAMP_ITEM_ID] ?? 0).toBe(0)
        expect(out[FISHING_ROD_ITEM_ID] ?? 0).toBe(0)
    })
})
