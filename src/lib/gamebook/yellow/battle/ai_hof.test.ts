import { describe, it, expect } from "vitest"
import { chooseAiAction, chooseReplacementIndex } from "./ai"
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

describe("chooseReplacementIndex — envoi FORCÉ après KO (fin du ping-pong)", () => {
    it("envoie le MEILLEUR matchup, pas « le suivant dans la liste »", () => {
        const foeWater = mon("razmaree", 60, ["hydrocanon"]) // actif joueur : attaquant EAU
        // Banc IA : index 0 = Magmator (Roche/Feu, ×4 faible à l'Eau = le piège « suivant ») ; index 1 = Cerfeuillu (Plante, résiste).
        const bad = mon("magmator", 60, ["charge"])
        const good = mon("cerfeuillu", 60, ["charge"])
        expect(chooseReplacementIndex([bad, good], foeWater)).toBe(1) // Cerfeuillu (résiste), PAS Magmator en tête
    })

    it("ignore les Daemons K.O. et garde l'ordre quand le meilleur est déjà en tête", () => {
        const foeWater = mon("razmaree", 60, ["hydrocanon"])
        const good = mon("cerfeuillu", 60, ["charge"])
        const bad = mon("magmator", 60, ["charge"])
        const ko = mon("rochison", 60, ["charge"]); ko.currentHp = 0 // K.O. → jamais choisi
        expect(chooseReplacementIndex([good, bad, ko], foeWater)).toBe(0) // le bon est déjà premier
        expect(chooseReplacementIndex([ko, bad], foeWater)).toBe(1)      // seul vivant pertinent = index 1
    })

    it("à défense égale, préfère le Daemon qui PUNIT l'adverse (tiebreak offensif)", () => {
        // Deux Daemons NEUTRES en défense face à un attaquant Normal, mais l'un porte un coup super-efficace.
        const foeNormal = mon("tonytony", 60, ["charge"]) // Normal (aucune faiblesse exploitée par le banc ci-dessous)
        const plain = mon("razmaree", 60, ["charge"])       // Eau, coup NORMAL neutre
        const puncher = mon("maitrezenc", 60, ["coup_de_boutoir"]) // Combat : ×2 sur Normal
        const idx = chooseReplacementIndex([plain, puncher], foeNormal)
        expect(idx).toBe(1) // celui qui frappe en super-efficace
    })
})

describe("scoreMoves — soin & recul (IA dresseur, anti-gâchis)", () => {
    it("ne lance PAS Repos à pleine vie, mais le lance à basse vie", () => {
        const foe = mon("cerfeuillu", 60, ["charge"]) // Plante : résiste l'Eau (pistolet ×0.5)
        for (let s = 0; s < 30; s++) {
            const full = mon("razmaree", 60, ["repos", "pistolet_a_o"]) // PV pleins par défaut
            expect(chooseAiAction(full, foe, [full], 0, "trainer", new Rng(s + 1))).toEqual({ kind: "move", moveIndex: 1 })
        }
        for (let s = 0; s < 30; s++) {
            const hurt = mon("razmaree", 60, ["repos", "pistolet_a_o"]); hurt.currentHp = 1
            expect(chooseAiAction(hurt, foe, [hurt], 0, "trainer", new Rng(s + 1))).toEqual({ kind: "move", moveIndex: 0 })
        }
    })

    it("évite l'attaque à RECUL à basse vie (anti-suicide), mais l'assume à pleine vie", () => {
        const foe = mon("cerfeuillu", 60, ["charge"]) // Normal neutre dessus
        for (let s = 0; s < 30; s++) {
            const full = mon("razmaree", 60, ["belier", "charge"]) // Bélier (recul) 90 vs Charge 40
            expect(chooseAiAction(full, foe, [full], 0, "trainer", new Rng(s + 1))).toEqual({ kind: "move", moveIndex: 0 })
        }
        for (let s = 0; s < 30; s++) {
            const hurt = mon("razmaree", 60, ["belier", "charge"]); hurt.currentHp = 1
            expect(chooseAiAction(hurt, foe, [hurt], 0, "trainer", new Rng(s + 1))).toEqual({ kind: "move", moveIndex: 1 })
        }
    })
})

describe("IA \"hof\" — anti-gâchis Ligue (moves immunisés + buffs)", () => {
    it("ne choisit JAMAIS un move IMMUNISÉ (Tranche NORMAL sur un SPECTRE) s'il a un autre coup", () => {
        const foe = mon("ombrapanthe", 60, ["charge"]) // SPECTRE : NORMAL ×0 (immunisé)
        for (let s = 0; s < 20; s++) {
            const self = mon("razmaree", 60, ["tranche", "pistolet_a_o"]) // Tranche NORMAL (immunisée) + Eau (neutre)
            expect(chooseAiAction(self, foe, [self], 0, "hof", new Rng(s + 1))).toEqual({ kind: "move", moveIndex: 1 })
        }
    })
    it("ne se BUFFE PAS à bas PV — il frappe (anti « Danse-Lames alors qu'il va mourir »)", () => {
        const foe = mon("tonytony", 60, ["charge"]) // Normal, neutre sur l'Eau
        for (let s = 0; s < 20; s++) {
            const self = mon("razmaree", 60, ["danse_lames", "pistolet_a_o"]); self.currentHp = 1
            expect(chooseAiAction(self, foe, [self], 0, "hof", new Rng(s + 1))).toEqual({ kind: "move", moveIndex: 1 })
        }
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
