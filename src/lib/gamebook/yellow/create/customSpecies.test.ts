import { describe, it, expect } from "vitest"
import {
    type CustomSpec, validateSpec, buildCustomSpecies, moveOptionsFor, slotOptions, maxPowerForLevel,
    bloomerBudget, LEARN_LEVELS, STAT_KEYS, lineTypes, typesAtStage, moveRarity, isLearnableMove,
    statusTier, statusTierCapForLevel, allowedOffensiveTypes, weaknessTypes, moveCard,
    MAX_STAB, MAX_COVERAGE, MIN_STATUS_RATIO,
} from "./customSpecies"
import { getMove, MOVES } from "../data/moves"
import { isDamagingMove } from "./customSpecies"
import type { StatKey, PokeType, MoveData } from "../battle/types"

const bst = (s: Record<StatKey, number>) => STAT_KEYS.reduce((a, k) => a + s[k], 0)

// Construit un learnset VALIDE : 3 statuts (slots mid/late) + 7 offensives (priorité commune/STAB), distinctes.
function buildValidLearnset(types: PokeType[]) {
    const used = new Set<string>()
    const pick = (ids: string[]) => { for (const id of ids) if (!used.has(id)) { used.add(id); return id } return ids[0] }
    return LEARN_LEVELS.map((lvl, i) => {
        const { offensive, status } = slotOptions(types, lvl)
        if (status.length && (i === 3 || i === 6 || i === 8)) return { level: lvl, moveId: pick(status) }
        const common = offensive.filter((id) => { const r = moveRarity(id); return r === "commune" || r === "répandue" })
        return { level: lvl, moveId: pick(common.length ? common : offensive) }
    })
}
function validSpec(): CustomSpec {
    return {
        name: "Aquarenard", da: "un renard d'eau vive aux nageoires de brume", character: "vif et joueur",
        stages: 3, bloomer: "mid",
        finalTypes: ["EAU"],
        finalStats: { hp: 90, atk: 70, def: 85, spe: 100, spc: 90 }, // 435 = budget mid
        learnset: buildValidLearnset(["EAU"]),
    }
}

describe("création — accessibilité des attaques (moveOptionsFor)", () => {
    it("n'expose QUE des attaques réellement apprises (jamais de CT-only)", () => {
        for (const lvl of [5, 18, 36, 54]) for (const id of moveOptionsFor(["FEU"], lvl)) expect(isLearnableMove(id)).toBe(true)
        expect(isLearnableMove("apotheose")).toBe(false) // CT trophée
    })
    it("respecte le cap de puissance offensive par niveau", () => {
        for (const lvl of [5, 18, 27, 36, 54]) for (const id of moveOptionsFor(["FEU", "VOL"], lvl)) {
            const m = getMove(id)!; if (isDamagingMove(m)) expect(m.power > 0 ? m.power : (m.effect?.fixedDamage ?? 0)).toBeLessThanOrEqual(maxPowerForLevel(lvl))
        }
    })
    it("cohérence dex-like + anti-patch : pas d'attaque offensive d'un type dont on est FAIBLE", () => {
        const weak = new Set(weaknessTypes(["FEU"])) // FEU faible à EAU/SOL/ROCHE
        for (const id of moveOptionsFor(["FEU"], 54)) { const m = getMove(id)!; if (isDamagingMove(m)) expect(weak.has(m.type)).toBe(false) }
        expect(allowedOffensiveTypes(["FEU"]).has("EAU")).toBe(false) // faiblesse → interdit
        expect(allowedOffensiveTypes(["FEU"]).has("NORMAL")).toBe(true)
        expect(allowedOffensiveTypes(["FEU"]).has("FEU")).toBe(true)
    })
    it("statuts proposés PROGRESSIVEMENT (force ≤ cap du niveau)", () => {
        // niv 5-17 : seulement les statuts les plus faibles (tier 1 = débuff adverse −1). Les +2/sommeil/soin arrivent tard.
        for (const id of slotOptions(["EAU"], 5).status) expect(statusTier(getMove(id)!)).toBeLessThanOrEqual(statusTierCapForLevel(5))
        for (const id of slotOptions(["EAU"], 30).status) expect(statusTier(getMove(id)!)).toBeLessThanOrEqual(statusTierCapForLevel(30))
        expect(statusTierCapForLevel(5)).toBeLessThan(statusTierCapForLevel(54)) // progression croissante
    })
})

describe("création — rareté & fiche", () => {
    it("moveRarity : tiers cohérents (Charge très commune, signatures exceptionnelles)", () => {
        expect(moveRarity("charge")).toBe("commune")
        expect(["rare", "exceptionnelle"]).toContain(moveRarity("faille_sismique"))
    })
    it("moveCard fournit toutes les infos pour choisir", () => {
        const c = moveCard("lance_flammes", ["FEU"])!
        expect(c.stab).toBe(true); expect(c.cat).toBe("SPÉ"); expect(c.power).toBeGreaterThan(0); expect(c.rarity).toBeTruthy()
    })
})

describe("création — statusTier (classement de force)", () => {
    it("−1 adverse < +1 soi < +2 soi / sommeil / soin", () => {
        expect(statusTier(getMove("hurlement")!)).toBe(1)       // atk-1 adverse
        expect(statusTier(getMove("mur_de_fer")!)).toBe(2)      // def+1 soi
        expect(statusTier(getMove("danse_lames")!)).toBe(3)     // atk+2 soi
        expect(statusTier(getMove("repos")!)).toBe(4)           // soin
    })
})

describe("création — validateSpec (règles de composition)", () => {
    it("accepte une spec valide", () => {
        expect(validateSpec(validSpec())).toEqual([])
    })
    it("refuse trop peu de statuts (< 25%)", () => {
        const s = validSpec()
        const off = slotOptions(["EAU"], 54).offensive[0]
        s.learnset = LEARN_LEVELS.map((lvl, i) => ({ level: lvl, moveId: slotOptions(["EAU"], lvl).offensive[i % 3] ?? off })) // que de l'offensif
        expect(validateSpec(s).some((m) => m.includes("Trop peu de statuts"))).toBe(true)
    })
    it("refuse une attaque trop puissante pour un bas niveau", () => {
        const s = validSpec()
        const strong = Object.values(MOVES).find((m) => (m.power > 65) && (m.type === "EAU" || m.type === "NORMAL") && isLearnableMove(m.id))!
        s.learnset = [...s.learnset]; s.learnset[0] = { level: 5, moveId: strong.id }
        expect(validateSpec(s).some((m) => m.includes("n'est pas accessible"))).toBe(true)
    })
    it("refuse un doublon", () => {
        const s = validSpec()
        s.learnset = [...s.learnset]; s.learnset[1] = { level: 5, moveId: s.learnset[0].moveId }
        expect(validateSpec(s).some((m) => m.includes("en double"))).toBe(true)
    })
    it("refuse un BST au-dessus du budget", () => {
        const s = validSpec(); s.finalStats = { hp: 160, atk: 160, def: 160, spe: 160, spc: 160 }
        expect(validateSpec(s).some((m) => m.includes("BST trop élevé"))).toBe(true)
    })
})

describe("création — buildCustomSpecies (inchangé : lignée légale)", () => {
    it("génère 3 stades chaînés, stats finales exactes, types respectés", () => {
        const s: CustomSpec = { ...validSpec(), finalTypes: ["ELEC", "PSY"], typeChange: { atStage: 3, types: ["ELEC"] }, learnset: buildValidLearnset(["ELEC", "PSY"]) }
        const chain = buildCustomSpecies(s, "mools")
        expect(chain).toHaveLength(3)
        expect(chain[2].baseStats).toEqual(s.finalStats)
        expect(chain[0].types).toEqual(["ELEC"]); expect(chain[2].types).toEqual(["ELEC", "PSY"])
        expect(typesAtStage(s, 2)).toEqual(["ELEC"])
        for (const sp of chain) for (const l of sp.learnset) expect(getMove(l.moveId)).toBeTruthy()
    })
    it("ids uniques par propriétaire", () => {
        expect(buildCustomSpecies(validSpec(), "mools")[0].id).not.toBe(buildCustomSpecies(validSpec(), "franss")[0].id)
    })
})

// garde-fous divers
void bst; void bloomerBudget; void lineTypes; void MAX_STAB; void MAX_COVERAGE; void MIN_STATUS_RATIO
type _ = MoveData
