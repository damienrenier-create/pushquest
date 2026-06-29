import { describe, it, expect } from "vitest"
import { chooseAiAction } from "./ai"
import { toBattleMon } from "./engine"
import { fullStats } from "./stats"
import { createMonInstance } from "./factory"
import { getSpecies } from "../data/species"
import { Rng } from "./rng"

// Construit un combattant runtime à partir d'une espèce + attaques imposées (override du learnset, OK).
const mon = (speciesId: string, level: number, moveIds: string[]) =>
    toBattleMon(createMonInstance(speciesId, level, { moveIds, owned: false }))

describe("IA Hall of Fame (\"hof\") — la plus maligne", () => {
    it("préfère le coup SUPER-EFFICACE à un coup neutre de même puissance", () => {
        const self = mon("razmaree", 60, ["pistolet_a_o", "charge"]) // EAU 40 vs NORMAL 40
        const foe = mon("magmator", 60, ["charge"])                   // Roche/Feu → Eau ×4
        const choice = chooseAiAction(self, foe, [self], 0, "hof", new Rng(1))
        expect(choice.kind).toBe("move")
        expect(choice.moveIndex).toBe(0) // pistolet_a_o (Eau ×4) domine la Charge neutre
    })

    it("OUVRE par un statut sur une cible fraîche et saine, mais frappe si elle est déjà entamée", () => {
        const self = mon("razmaree", 60, ["cage_eclair", "pistolet_a_o"]) // statut (para) + attaque
        const fresh = mon("cerfeuillu", 60, ["charge"])                    // Plante (résiste Eau ×0.5)
        const opener = chooseAiAction(self, fresh, [self], 0, "hof", new Rng(2))
        expect(opener.moveIndex).toBe(0) // mène par Cage-Éclair (cible fraîche)

        const hurt = mon("cerfeuillu", 60, ["charge"])
        hurt.currentHp = 1 // cible entamée → le statut perd son intérêt d'ouverture
        const attack = chooseAiAction(self, hurt, [self], 0, "hof", new Rng(2))
        expect(attack.moveIndex).toBe(1) // frappe plutôt que de statuer une cible déjà au tapis
    })

    it("CHANGE de Daemon face à une faiblesse ×4 imparable, sans le faire hors de ce cas (anti yo-yo)", () => {
        // ×4 : Rochison (Roche/Sol) actif face à un assaillant EAU, banc = Cerfeuillu (résiste Eau).
        const weakLead = mon("rochison", 60, ["charge"])
        const bench = mon("cerfeuillu", 60, ["charge"])
        const foeWater = mon("razmaree", 60, ["hydrocanon"])
        let switches = 0
        for (let s = 0; s < 40; s++) {
            const c = chooseAiAction(weakLead, foeWater, [weakLead, bench], 0, "hof", new Rng(s + 1))
            if (c.kind === "switch") { expect(c.teamIndex).toBe(1); switches++ }
        }
        expect(switches).toBeGreaterThan(10) // le switch se déclenche bien (≈75% du temps)

        // Contrôle : un lead qui RÉSISTE ne doit JAMAIS changer.
        const safeLead = mon("cerfeuillu", 60, ["charge"])
        let safeSwitches = 0
        for (let s = 0; s < 40; s++) {
            const c = chooseAiAction(safeLead, foeWater, [safeLead, weakLead], 0, "hof", new Rng(s + 1))
            if (c.kind === "switch") safeSwitches++
        }
        expect(safeSwitches).toBe(0)
    })
})

describe("fullStats — stats FIGÉES (Hall of Fame)", () => {
    it("renvoie telles quelles les frozenStats si présentes (aucun recalcul)", () => {
        const species = getSpecies("razmaree")!
        const frozen = { hp: 222, atk: 123, def: 111, spe: 145, spc: 167 }
        const inst = createMonInstance("razmaree", 50, { owned: false })
        const out = fullStats({ ...inst, frozenStats: frozen }, species)
        expect(out).toEqual(frozen)
        // Sans frozenStats, le calcul normal diffère (preuve que c'est bien le court-circuit qui agit).
        expect(fullStats(inst, species)).not.toEqual(frozen)
    })
})
