import { describe, it, expect } from "vitest"
import {
    type CustomSpec, validateSpec, buildCustomSpecies, buildNemesis, moveOptionsFor, slotOptions, maxPowerForLevel,
    bloomerBudget, LEARN_LEVELS, STAT_KEYS, lineTypes, typesAtStage, moveRarity, isLearnableMove,
    statusTier, statusTierCapForLevel, allowedOffensiveTypes, weaknessTypes, moveCard, suggestLearnset,
    MAX_STAB, MAX_COVERAGE, MIN_STATUS_RATIO, ROLES, CURVE_RATIOS, powerPoolMod, effectiveMaxPower,
    STAT_HARD_CAP, STAT_DEX_MAX, specStatCost, fitStatsToBudget, STALL_BULK_THRESHOLD, effectivePower, maxAvgOffPower, POWER_AVG_TOLERANCE, hasNoSideEffect,
    attributeMoveIds, ATTRIBUTE_MOVES, MAX_ATTRIBUTES, gatePower, TALENTS, TALENT_KEYS, weakestStatKey,
    ultimatePowerCap, ultimateMoveOptions, ULTIMATE_LEVEL,
} from "./customSpecies"
import { getMove, MOVES } from "../data/moves"
import { getSpecies, registerCustomSpecies, isCustomSpeciesId } from "../data/species"
import { createMonInstance } from "../battle/factory"
import { isDamagingMove } from "./customSpecies"
import type { StatKey, PokeType, MoveData } from "../battle/types"

const bst = (s: Record<StatKey, number>) => STAT_KEYS.reduce((a, k) => a + s[k], 0)

// Learnset VALIDE-par-construction = la suggestion du kernel (3 statuts + offensives communes, coverage ≤ cap).
function buildValidLearnset(types: PokeType[]) {
    return suggestLearnset(types)
}
function validSpec(): CustomSpec {
    return {
        name: "Aquarenard", da: "un renard d'eau vive aux nageoires de brume", character: "vif et joueur",
        stages: 3, bloomer: "mid", curve: "linear", role: "equilibre",
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
    it("gate d'effet : les attaques à effet fort (Météores, priorité) sont gatées plus tard que leur puissance brute", () => {
        const meteores = getMove("meteores")!
        expect(gatePower(meteores)).toBeGreaterThan(effectivePower(meteores))         // sureHit → prime
        expect(gatePower(getMove("vive_attaque")!)).toBeGreaterThan(effectivePower(getMove("vive_attaque")!)) // priorité
        expect(gatePower(getMove("charge")!)).toBe(effectivePower(getMove("charge")!)) // basique → aucune prime
        // Météores : refusée avant ~27, dispo au palier 30 (plus « incroyable au niv 18 »).
        expect(gatePower(meteores)).toBeGreaterThan(maxPowerForLevel(24))
        expect(gatePower(meteores)).toBeLessThanOrEqual(maxPowerForLevel(30))
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
        const strong = Object.values(MOVES).find((m) => (m.power > 70) && (m.type === "EAU" || m.type === "NORMAL") && isLearnableMove(m.id))!
        s.learnset = [...s.learnset]; s.learnset[2] = { level: 12, moveId: strong.id } // slot 3 (niv 12, cap 60)
        expect(validateSpec(s).some((m) => m.includes("dépasse le pool") || m.includes("n'est pas accessible"))).toBe(true)
    })
    it("refuse un doublon", () => {
        const s = validSpec()
        s.learnset = [...s.learnset]; s.learnset[1] = { level: 5, moveId: s.learnset[0].moveId }
        expect(validateSpec(s).some((m) => m.includes("en double"))).toBe(true)
    })
    it("refuse un budget dépassé (stats toutes au max)", () => {
        const s = validSpec(); s.finalStats = { hp: 160, atk: 160, def: 160, spe: 160, spc: 160 }
        expect(validateSpec(s).some((m) => m.includes("plafonnée") || m.includes("Budget de stats"))).toBe(true)
    })
})

describe("création — modèle de stats (caps dex +10% · coût croissant · rôles=guides)", () => {
    it("plafonne chaque stat au record du dex +10%", () => {
        const s = validSpec(); s.bloomer = "late"; s.finalStats = { ...s.finalStats, atk: STAT_HARD_CAP.atk + 5 }
        expect(validateSpec(s).some((m) => m.includes("plafonnée"))).toBe(true)
    })
    it("un point AU-DESSUS du record du dex coûte double (budget)", () => {
        // spe AU record (130) : coût = valeur brute. Au-delà : +2 de budget par point.
        const base = { hp: 60, atk: 60, def: 60, spe: STAT_DEX_MAX.spe, spc: 60 }
        const over = { ...base, spe: STAT_DEX_MAX.spe + 13 } // 13 points au-delà du record → +26 de coût
        expect(specStatCost(over)).toBe(specStatCost(base) + 13 * 2)
    })
    it("les rôles ne bloquent plus les stats (guides) : un attaquant-phys peut dumper l'Attaque", () => {
        const s = validSpec(); s.role = "attaquant-phys"
        s.finalStats = { hp: 90, atk: 30, def: 90, spe: 90, spc: 120 } // atk faible, spc fort — hors du rôle, mais légal
        s.finalTypes = ["EAU"]; s.learnset = buildValidLearnset(["EAU"]) // type spécial cohérent avec spc dominant
        expect(validateSpec(s)).toEqual([])
    })
    it("fitStatsToBudget ramène un profil trop lourd sous le budget early", () => {
        const early = bloomerBudget("early") // 392
        for (const rk of Object.keys(ROLES) as (keyof typeof ROLES)[]) {
            const fitted = fitStatsToBudget(ROLES[rk].profile, early)
            expect(specStatCost(fitted)).toBeLessThanOrEqual(early)
            for (const k of STAT_KEYS) { expect(fitted[k]).toBeGreaterThanOrEqual(15); expect(fitted[k]).toBeLessThanOrEqual(STAT_HARD_CAP[k]) }
        }
    })
})

describe("création — correctifs d'équilibrage (audit)", () => {
    it("C4 — incohérence stat/type : grosse Attaque + type 100% spécial = refusé", () => {
        const s = validSpec(); s.finalTypes = ["FEU"] // spécial
        s.finalStats = { hp: 70, atk: 130, def: 60, spe: 90, spc: 40 } // atk >> spc → dominante physique
        s.learnset = buildValidLearnset(["FEU"])
        expect(validateSpec(s).some((m) => m.includes("Incohérence stat/type"))).toBe(true)
    })
    it("C4 — cohérent : grosse Attaque + type physique = accepté", () => {
        const s = validSpec(); s.finalTypes = ["ROCHE"] // physique
        s.finalStats = { hp: 70, atk: 130, def: 70, spe: 80, spc: 40 }
        s.learnset = buildValidLearnset(["ROCHE"])
        expect(validateSpec(s).filter((m) => m.includes("Incohérence stat/type"))).toEqual([])
    })
    it("C3 — typeChange : les attaques de l'ancien type comptent comme COUVERTURE sur la finale", () => {
        // finale PSY, pré-évo FEU : un learnset bourré de FEU dépasse MAX_COVERAGE sur la forme finale.
        const s = validSpec()
        s.finalTypes = ["PSY"]; s.typeChange = { atStage: 3, types: ["FEU"] }
        const feu = Object.values(MOVES).filter((m) => m.type === "FEU" && m.power > 0 && isLearnableMove(m.id)).slice(0, 4).map((m) => m.id)
        s.learnset = LEARN_LEVELS.map((lvl, i) => ({ level: lvl, moveId: feu[i] ?? "choc_mental" }))
        expect(validateSpec(s).some((m) => m.includes("couverture"))).toBe(true)
    })
    it("C5 — anti-stall : gros bulk + soin + usure = refusé", () => {
        const s = validSpec(); s.role = "mur"; s.finalTypes = ["POISON"]
        s.finalStats = { hp: 120, atk: 40, def: 120, spe: 40, spc: 80 } // bulk 240 ≥ seuil
        expect(s.finalStats.hp + s.finalStats.def).toBeGreaterThanOrEqual(STALL_BULK_THRESHOLD)
        // learnset : Repos (soin) + Toxik (usure) + Vampigraine (usure) + offensives
        const off = slotOptions(["POISON"], 54).offensive.filter((id) => moveRarity(id) === "commune" || moveRarity(id) === "répandue")
        s.learnset = LEARN_LEVELS.map((lvl, i) => ({ level: lvl, moveId: i === 5 ? "repos" : i === 6 ? "toxik" : i === 8 ? "vampigraine" : (off[i] ?? off[0]) }))
        expect(validateSpec(s).some((m) => m.includes("stall"))).toBe(true)
    })
    it("M2 — Vampigraine classée tier 3 (comme Toxik), pas cherry-pickable tôt", () => {
        expect(statusTier(getMove("vampigraine")!)).toBe(3)
        expect(statusTier(getMove("toxik")!)).toBe(3)
    })
    it("pool de puissance : la moyenne de la suggestion reste dans les clous (± tolérance)", () => {
        for (const t of ["FEU", "EAU", "NORMAL", "PSY", "COMBAT"] as PokeType[]) for (const bst of [335, 435, 480]) {
            const off = suggestLearnset([t], bst).map((l) => getMove(l.moveId)!).filter(isDamagingMove)
            const avg = Math.round(off.reduce((a, m) => a + effectivePower(m), 0) / off.length)
            expect(avg).toBeLessThanOrEqual(maxAvgOffPower(bst, [t]) + POWER_AVG_TOLERANCE)
        }
    })
    it("slots forcés : la suggestion met une attaque basique en slot 1 et un statut en slot 2", () => {
        const ls = suggestLearnset(["FEU"], 435)
        const m0 = getMove(ls[0].moveId)!, m1 = getMove(ls[1].moveId)!
        expect(isDamagingMove(m0)).toBe(true); expect(hasNoSideEffect(m0)).toBe(true); expect(effectivePower(m0)).toBeLessThanOrEqual(45)
        expect(isDamagingMove(m1)).toBe(false) // statut
    })
    it("pool de puissance : refuse un learnset qui bourre des attaques fortes partout", () => {
        const s = validSpec(); s.bloomer = "late"
        s.finalTypes = ["EAU"]; s.finalStats = { hp: 90, atk: 60, def: 90, spe: 90, spc: 120 }
        // On remplit les 10 slots avec des attaques P≥80 : la cascade cumulative doit en refuser au moins une.
        const strong = Object.values(MOVES).filter((m) => m.power >= 80 && isLearnableMove(m.id)).slice(0, LEARN_LEVELS.length).map((m) => m.id)
        s.learnset = LEARN_LEVELS.map((lvl, i) => ({ level: lvl, moveId: strong[i] ?? "charge" }))
        expect(validateSpec(s).some((m) => m.includes("pool de puissance") || m.includes("BASIQUE") || m.includes("n'est pas accessible"))).toBe(true)
    })
})

describe("création — forme de courbe & pool modulé", () => {
    it("accélérée démarre plus bas que décélérée pour un même stade final", () => {
        const acc = validSpec(); acc.curve = "accel"
        const dec = validSpec(); dec.curve = "decel"
        const baseAcc = buildCustomSpecies(acc, "mools")[0].baseStats
        const baseDec = buildCustomSpecies(dec, "mools")[0].baseStats
        const sum = (x: Record<string, number>) => STAT_KEYS.reduce((a, k) => a + x[k], 0)
        expect(sum(baseAcc)).toBeLessThan(sum(baseDec))
        expect(CURVE_RATIOS.accel[0]).toBeLessThan(CURVE_RATIOS.decel[0])
        expect(CURVE_RATIOS.linear[2]).toBe(1) // le stade final = 100% du budget
    })
    it("powerPoolMod : BST faible → bonus, BST élevé → malus (clampé)", () => {
        expect(powerPoolMod(300, ["NORMAL"])).toBeGreaterThan(0)
        expect(powerPoolMod(480, ["SOL"])).toBeLessThan(0)
        for (const b of [200, 300, 435, 480]) expect(Math.abs(powerPoolMod(b, ["EAU"]))).toBeLessThanOrEqual(0.15)
    })
    it("effectiveMaxPower reste borné autour du cap de base du niveau", () => {
        for (const lvl of [5, 27, 54]) for (const b of [280, 435, 480]) {
            const p = effectiveMaxPower(lvl, b, ["FEU"])
            expect(p).toBeGreaterThan(maxPowerForLevel(lvl) * 0.8)
            expect(p).toBeLessThan(maxPowerForLevel(lvl) * 1.2)
        }
    })
})

describe("création — attributs anatomiques (couverture hors-type)", () => {
    it("un attribut débloque ses attaques hors-type", () => {
        expect(moveOptionsFor(["FEU"], 54, 435).includes("vol")).toBe(false)
        expect(moveOptionsFor(["FEU"], 54, 435, attributeMoveIds(["ailes"])).includes("vol")).toBe(true)
    })
    it("l'attribut prime sur l'anti-patch (débloque même une faiblesse)", () => {
        expect(moveOptionsFor(["FEU"], 54, 435, attributeMoveIds(["sabots"])).includes("seisme")).toBe(true) // SOL = faiblesse du Feu
    })
    it("le cap de puissance du niveau s'applique quand même aux attaques d'attribut", () => {
        expect(moveOptionsFor(["FEU"], 5, 435, attributeMoveIds(["ailes"])).includes("pique_fatal")).toBe(false) // P90 > cap niv 5
    })
    it("chaque type élémentaire est couvert par ≥1 attribut", () => {
        const covered = new Set<string>()
        for (const ids of Object.values(ATTRIBUTE_MOVES)) for (const id of ids) { const m = getMove(id); if (m) covered.add(m.type) }
        for (const t of ["EAU", "ELEC", "GLACE", "VOL", "FEU", "PLANTE", "PSY", "SOL", "COMBAT", "ROCHE", "INSECTE", "POISON", "SPECTRE", "DRAGON"]) expect(covered.has(t)).toBe(true)
    })
    it("validateSpec refuse plus de MAX_ATTRIBUTES attributs", () => {
        const s = validSpec(); s.attributes = ["ailes", "crocs", "dard"]
        expect(s.attributes.length).toBeGreaterThan(MAX_ATTRIBUTES)
        expect(validateSpec(s).some((m) => m.includes("Attributs invalides"))).toBe(true)
    })
})

describe("création — talent secret (tirage + reroll)", () => {
    it("weakestStatKey = la stat la plus faible (la monnaie du reroll)", () => {
        expect(weakestStatKey({ hp: 90, atk: 40, def: 85, spe: 100, spc: 90 })).toBe("atk")
        expect(weakestStatKey({ hp: 120, atk: 60, def: 120, spe: 45, spc: 90 })).toBe("spe")
    })
    it("chaque talent a un label + une description ; ≥ 10 talents", () => {
        for (const k of TALENT_KEYS) { expect(TALENTS[k].label).toBeTruthy(); expect(TALENTS[k].desc).toBeTruthy() }
        expect(TALENT_KEYS.length).toBeGreaterThanOrEqual(10)
    })
})

describe("création — Némésis (contre-lignée d'ACE)", () => {
    const cases: Array<{ types: PokeType[]; stats: Record<StatKey, number> }> = [
        { types: ["FEU"], stats: { hp: 70, atk: 130, def: 60, spe: 120, spc: 40 } },       // glass cannon rapide
        { types: ["EAU"], stats: { hp: 120, atk: 60, def: 120, spe: 45, spc: 90 } },        // mur lent
        { types: ["PLANTE", "SOL"], stats: { hp: 90, atk: 100, def: 90, spe: 80, spc: 75 } },
        { types: ["PSY"], stats: { hp: 85, atk: 60, def: 80, spe: 95, spc: 120 } },
    ]
    it("génère une lignée VALIDE, super-efficace contre le joueur, à l'archétype inversé", () => {
        for (const c of cases) {
            const player: CustomSpec = { ...validSpec(), finalTypes: c.types, finalStats: c.stats }
            const nem = buildNemesis(player)
            expect(validateSpec(nem)).toEqual([])                                    // némésis toujours jouable/légal
            expect(weaknessTypes(c.types).some((t) => nem.finalTypes.includes(t)) || nem.finalTypes.includes("DRAGON")).toBe(true) // le frappe SE
            if (c.stats.spe >= 100) expect(nem.finalStats.spe).toBeLessThan(c.stats.spe)   // joueur rapide → némésis costaud
            else expect(nem.finalStats.spe).toBeGreaterThan(c.stats.spe)                   // joueur lent → némésis rapide
        }
    })
})

describe("création — registre runtime (Phase 2 : jouable en combat)", () => {
    it("une lignée custom enregistrée est résolue par getSpecies et instanciable", () => {
        const chain = buildCustomSpecies(validSpec(), "registrytest")
        expect(getSpecies(chain[2].id)).toBeNull()   // inconnue AVANT enregistrement
        registerCustomSpecies(chain)
        expect(getSpecies(chain[2].id)).toBeTruthy()  // résolue APRÈS
        expect(isCustomSpeciesId(chain[2].id)).toBe(true)
        const mon = createMonInstance(chain[2].id, 50) // ne throw plus "Espèce inconnue"
        expect(mon.speciesId).toBe(chain[2].id)
        expect(mon.moves.length).toBeGreaterThan(0)
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

describe("Carotte ultime (slot bonus hors pool)", () => {
    it("cap par vitesse : rapide (≥100)→70, moyen→75, lent (≤60)→80", () => {
        expect(ultimatePowerCap(120)).toBe(70)
        expect(ultimatePowerCap(100)).toBe(70)
        expect(ultimatePowerCap(80)).toBe(75)
        expect(ultimatePowerCap(61)).toBe(75)
        expect(ultimatePowerCap(60)).toBe(80)
        expect(ultimatePowerCap(30)).toBe(80)
    })
    it("options = offensives de ton type, P ≤ cap-vitesse, non déjà prises", () => {
        const s = validSpec() // EAU, spe 100 → cap 70
        const opts = ultimateMoveOptions(s)
        expect(opts.length).toBeGreaterThan(0)
        for (const id of opts) {
            const m = getMove(id)!
            expect(isDamagingMove(m)).toBe(true)
            expect(effectivePower(m)).toBeLessThanOrEqual(70)
            expect(s.learnset.some((l) => l.moveId === id)).toBe(false)
        }
    })
    it("validateSpec : carotte valide acceptée ; carotte trop forte refusée", () => {
        const s = validSpec()
        const good = ultimateMoveOptions(s)[0]
        expect(validateSpec({ ...s, ultimateMove: good }).filter((e) => e.includes("Carotte"))).toHaveLength(0)
        const strong = (Object.values(MOVES) as MoveData[]).find((m) => m.type === "EAU" && isDamagingMove(m) && effectivePower(m) > 70)
        if (strong) expect(validateSpec({ ...s, ultimateMove: strong.id }).some((e) => e.includes("Carotte"))).toBe(true)
    })
    it("buildCustomSpecies ajoute la carotte au learnset au niveau ULTIMATE_LEVEL", () => {
        const s = validSpec()
        const um = ultimateMoveOptions(s)[0]
        const chain = buildCustomSpecies({ ...s, ultimateMove: um }, "test")
        const final = chain[chain.length - 1]
        expect(final.learnset.some((l) => l.moveId === um && l.level === ULTIMATE_LEVEL)).toBe(true)
    })
})
