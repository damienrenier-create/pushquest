import { describe, it, expect } from "vitest"
import {
    type CustomSpec, validateSpec, buildCustomSpecies, moveOptionsFor, maxPowerForLevel,
    bloomerBudget, LEARN_LEVELS, STAT_KEYS, lineTypes, typesAtStage,
} from "./customSpecies"
import { getMove, MOVES } from "../data/moves"
import type { StatKey, PokeType } from "../battle/types"

const bst = (s: Record<StatKey, number>) => STAT_KEYS.reduce((a, k) => a + s[k], 0)
// Construit un learnset valide (1 attaque par palier, dans le bon tier) pour une lignée de types donnée.
function autoLearnset(types: PokeType[]) {
    return LEARN_LEVELS.map((lvl) => ({ level: lvl, moveId: moveOptionsFor(types, lvl)[0] }))
}
// Spec de référence valide : renard Élec → Élec/Psy au stade 3, éclosion tardive (budget 487).
function validSpec(): CustomSpec {
    return {
        name: "Voltarenard", da: "un renard aux nuages de fumée magnétiques", character: "rusé et électrique",
        stages: 3, bloomer: "late",
        finalTypes: ["ELEC", "PSY"],
        typeChange: { atStage: 3, types: ["ELEC"] },
        finalStats: { hp: 90, atk: 70, def: 80, spe: 130, spc: 117 }, // somme 487 = budget late
        learnset: autoLearnset(["ELEC", "PSY"]),
    }
}

describe("création de Daemon — moveOptionsFor / tiers", () => {
    it("respecte le tier de puissance par niveau (rien de trop fort tôt)", () => {
        for (const lvl of [5, 9, 18, 27, 36, 45, 54]) {
            for (const id of moveOptionsFor(["FEU", "VOL"], lvl)) {
                const m = getMove(id)!
                if (m.power > 0) expect(m.power).toBeLessThanOrEqual(maxPowerForLevel(lvl))
                else expect(lvl).toBeGreaterThanOrEqual(18) // statut : Tier 2+
            }
        }
    })
    it("propose au moins 2 attaques jouables au niveau 5 (les 2 de départ)", () => {
        expect(moveOptionsFor(["ELEC", "PSY"], 5).length).toBeGreaterThanOrEqual(2)
        expect(moveOptionsFor(["EAU"], 5).length).toBeGreaterThanOrEqual(2)
    })
    it("ne propose que des attaques compatibles type (lignée) ou NORMAL", () => {
        for (const id of moveOptionsFor(["FEU"], 45)) {
            const t = getMove(id)!.type
            expect(t === "NORMAL" || t === "FEU").toBe(true)
        }
    })
})

describe("création de Daemon — validateSpec", () => {
    it("accepte une spec valide", () => {
        expect(validateSpec(validSpec())).toEqual([])
    })
    it("refuse un BST au-dessus du budget de la courbe", () => {
        const s = validSpec(); s.finalStats = { hp: 160, atk: 160, def: 160, spe: 160, spc: 160 } // 800
        expect(validateSpec(s).some((m) => m.includes("BST trop élevé"))).toBe(true)
    })
    it("refuse une attaque trop puissante pour un bas niveau", () => {
        const s = validSpec()
        // Cherche une attaque >50 du bon type et tente de la mettre au niv 5.
        const strong = Object.values(MOVES).find((m) => m.power > 50 && (m.type === "ELEC" || m.type === "NORMAL"))!
        s.learnset = [...s.learnset]; s.learnset[0] = { level: 5, moveId: strong.id }
        expect(validateSpec(s).some((m) => m.includes("n'est pas autorisée"))).toBe(true)
    })
    it("refuse un type final invalide (doublon)", () => {
        const s = validSpec(); s.finalTypes = ["FEU", "FEU"]
        expect(validateSpec(s).some((m) => m.includes("Type final invalide"))).toBe(true)
    })
    it("le budget dépend de la courbe (early < mid < late)", () => {
        expect(bloomerBudget("early")).toBeLessThan(bloomerBudget("mid"))
        expect(bloomerBudget("mid")).toBeLessThan(bloomerBudget("late"))
    })
})

describe("création de Daemon — buildCustomSpecies (lignée légale)", () => {
    it("génère N stades chaînés par évolution au bon niveau", () => {
        const chain = buildCustomSpecies(validSpec(), "mools")
        expect(chain).toHaveLength(3)
        expect(chain[0].evolution?.toId).toBe(chain[1].id)
        expect(chain[1].evolution?.toId).toBe(chain[2].id)
        expect(chain[2].evolution).toBeUndefined()
        // évolution par niveau, croissante.
        const l0 = (chain[0].evolution!.method as { level: number }).level
        const l1 = (chain[1].evolution!.method as { level: number }).level
        expect(l1).toBeGreaterThan(l0)
    })
    it("le stade final porte EXACTEMENT les stats distribuées ; les stades < final sont plus faibles", () => {
        const s = validSpec()
        const chain = buildCustomSpecies(s, "mools")
        expect(chain[2].baseStats).toEqual(s.finalStats)
        expect(bst(chain[0].baseStats)).toBeLessThan(bst(chain[1].baseStats))
        expect(bst(chain[1].baseStats)).toBeLessThan(bst(chain[2].baseStats))
    })
    it("respecte le changement de type unique (stades < atStage portent les types pré-changement)", () => {
        const s = validSpec() // change au stade 3 → stades 1,2 = ELEC, stade 3 = ELEC/PSY
        const chain = buildCustomSpecies(s, "mools")
        expect(chain[0].types).toEqual(["ELEC"])
        expect(chain[1].types).toEqual(["ELEC"])
        expect(chain[2].types).toEqual(["ELEC", "PSY"])
        expect(typesAtStage(s, 2)).toEqual(["ELEC"])
    })
    it("toutes les attaques du learnset existent dans moves.ts", () => {
        const chain = buildCustomSpecies(validSpec(), "mools")
        for (const sp of chain) for (const l of sp.learnset) expect(getMove(l.moveId)).toBeTruthy()
    })
    it("ids uniques par propriétaire (partage Zone de Combat)", () => {
        const a = buildCustomSpecies(validSpec(), "mools")[0].id
        const b = buildCustomSpecies(validSpec(), "franss")[0].id
        expect(a).not.toBe(b)
    })
    it("lineTypes = union des types de la lignée", () => {
        expect(new Set(lineTypes(validSpec()))).toEqual(new Set(["ELEC", "PSY"]))
    })
})
