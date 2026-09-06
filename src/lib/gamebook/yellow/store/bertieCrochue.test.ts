import { describe, it, expect, beforeEach } from "vitest"
import { hydratePlayer, getPlayer, useBertieCrochue, grantBertieCrochueBatch } from "./playerStore"
import { createMonInstance } from "../battle/factory"
import { levelEvolutionTarget } from "../battle/evolution"
import { BERTIE_ITEM_ID } from "../data/items"

// PÂTES DE BERTIE CROCHUE — pari d'évolution. Bon tirage : +1 niveau + évolution forcée (hors palier). Mauvais tirage :
// dé-évolution + malédiction (refuse d'évoluer 5-20 niveaux) ; sur un stade de base → malédiction seule ("cursed").
// Chaîne de test : nouillon → vermisaint (16) → divinpate (34, stade final). File pré-tirée pour un tirage déterministe.
function setup(monSpecies: string, level: number, queue: ("good" | "bad")[], n = 1) {
    const mon = createMonInstance(monSpecies, level, { owned: true })
    hydratePlayer({ team: [mon], pc: [], items: { [BERTIE_ITEM_ID]: n }, bertieOutcomeQueue: queue })
    return mon.uid
}

describe("Pâtes de Bertie Crochue", () => {
    beforeEach(() => hydratePlayer({ team: [], pc: [], items: {}, bertieOutcomeQueue: [] }))

    it("bon tirage : +1 niveau ET évolution forcée (même hors palier)", () => {
        const uid = setup("nouillon", 5, ["good"])
        const r = useBertieCrochue(uid)
        expect(r.ok).toBe(true)
        expect(r.outcome).toBe("evolved")
        expect(getPlayer().team[0].speciesId).toBe("vermisaint") // évolue à niv 5 (palier normal = 16) → forcé
        expect(getPlayer().team[0].level).toBeGreaterThanOrEqual(6) // +1 niveau
        expect(getPlayer().items[BERTIE_ITEM_ID] ?? 0).toBe(0)     // objet consommé
    })

    it("mauvais tirage : dé-évolution + malédiction anti-évolution", () => {
        const uid = setup("vermisaint", 20, ["bad"]) // niv 20 (≥16 → pourrait évoluer normalement)
        const r = useBertieCrochue(uid)
        expect(r.outcome).toBe("devolved")
        const m = getPlayer().team[0]
        expect(m.speciesId).toBe("nouillon")               // régresse d'un stade
        expect(m.level).toBe(20)                            // niveau inchangé
        expect(m.evoLockUntilLevel).toBeGreaterThan(20)     // maudit
        expect(levelEvolutionTarget(m)).toBeNull()          // refuse d'évoluer malgré niv ≥ palier
    })

    it("mauvais tirage sur un stade de BASE : pas de dé-évo mais malédiction ('cursed')", () => {
        const uid = setup("nouillon", 20, ["bad"])
        const r = useBertieCrochue(uid)
        expect(r.outcome).toBe("cursed")
        const m = getPlayer().team[0]
        expect(m.speciesId).toBe("nouillon")            // rien en dessous → pas de régression
        expect(m.evoLockUntilLevel).toBeGreaterThan(20) // malédiction quand même
        expect(levelEvolutionTarget(m)).toBeNull()
    })

    it("bon tirage sur un stade FINAL : +1 niveau seul ('flat')", () => {
        const uid = setup("divinpate", 40, ["good"])
        const r = useBertieCrochue(uid)
        expect(r.outcome).toBe("flat")
        expect(getPlayer().team[0].speciesId).toBe("divinpate")
        expect(getPlayer().team[0].level).toBe(41)
    })

    it("bon tirage sur un Daemon MAUDIT : refuse d'évoluer, +1 niveau seul", () => {
        const mon = createMonInstance("nouillon", 20, { owned: true })
        mon.evoLockUntilLevel = 30 // déjà maudit
        hydratePlayer({ team: [mon], pc: [], items: { [BERTIE_ITEM_ID]: 1 }, bertieOutcomeQueue: ["good"] })
        const r = useBertieCrochue(mon.uid)
        expect(r.outcome).toBe("flat")                  // maudit → pas d'évolution
        expect(getPlayer().team[0].speciesId).toBe("nouillon")
        expect(getPlayer().team[0].level).toBe(21)
    })

    it("refuse si plus d'objet", () => {
        const mon = createMonInstance("nouillon", 5, { owned: true })
        hydratePlayer({ team: [mon], pc: [], items: {}, bertieOutcomeQueue: [] })
        expect(useBertieCrochue(mon.uid)).toEqual({ ok: false, reason: "none" })
    })

    it("grantBertieCrochueBatch(3) : 3 objets + file de 3 avec exactement 1 mauvaise", () => {
        hydratePlayer({ team: [], pc: [], items: {}, bertieOutcomeQueue: [] })
        grantBertieCrochueBatch(3)
        expect(getPlayer().items[BERTIE_ITEM_ID]).toBe(3)
        const q = getPlayer().bertieOutcomeQueue
        expect(q.length).toBe(3)
        expect(q.filter((x) => x === "bad").length).toBe(1) // 2 bonnes + 1 mauvaise
    })
})
