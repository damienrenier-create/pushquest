import { describe, it, expect } from "vitest"
import { POKE_TYPES } from "../battle/types"
import { typeMultiplier, typeEffectiveness, moveCategory } from "../battle/typeChart"
import { getSpecies } from "./species"
import { getMove } from "./moves"
import { rollWildEncounter } from "./encounters"
import { isHhKidDawn, isHhKidNight } from "./hhKid"

// 🧚 Le TYPE FÉE (1er du jeu) + son unique porteur, le légendaire UKOGNOS (run 2, alter-ego de Goshendofy).
describe("Type FÉE — table des types (némésis du Dragon)", () => {
    it("offensif : super-efficace vs Dragon et Combat", () => {
        expect(typeMultiplier("FEE", "DRAGON")).toBe(2)
        expect(typeMultiplier("FEE", "COMBAT")).toBe(2)
    })
    it("offensif : résisté par Feu et Poison, neutre ailleurs", () => {
        expect(typeMultiplier("FEE", "FEU")).toBe(0.5)
        expect(typeMultiplier("FEE", "POISON")).toBe(0.5)
        expect(typeMultiplier("FEE", "NORMAL")).toBe(1)
        expect(typeMultiplier("FEE", "SPECTRE")).toBe(1)
    })
    it("défensif : IMMUNE au Dragon (0×)", () => {
        expect(typeMultiplier("DRAGON", "FEE")).toBe(0)
        expect(typeEffectiveness("DRAGON", ["FEE"])).toBe(0)
    })
    it("défensif : résiste Combat et Insecte, faible au Poison", () => {
        expect(typeMultiplier("COMBAT", "FEE")).toBe(0.5)
        expect(typeMultiplier("INSECTE", "FEE")).toBe(0.5)
        expect(typeMultiplier("POISON", "FEE")).toBe(2)
    })
    it("mono-Fée : UNE SEULE faiblesse dans le roster (Poison)", () => {
        const weaks = POKE_TYPES.filter((t) => typeMultiplier(t, "FEE") === 2)
        expect(weaks).toEqual(["POISON"])
    })
    it("FÉE est un type SPÉCIAL (frappe sur le Spécial)", () => {
        expect(moveCategory("FEE")).toBe("SPECIAL")
    })
})

describe("Attaques FÉE", () => {
    it("les 3 moves Fée existent et sont bien de type FEE", () => {
        for (const id of ["voile_feerique", "eclat_lunaire", "cataclysme_lunaire"]) {
            const m = getMove(id)
            expect(m, id).toBeTruthy()
            expect(m!.type).toBe("FEE")
        }
    })
    it("le capstone Cataclysme Lunaire est le plus puissant (miroir du Souffle Primordial)", () => {
        expect(getMove("cataclysme_lunaire")!.power).toBeGreaterThan(getMove("eclat_lunaire")!.power)
    })
})

describe("UKOGNOS — légendaire mono-Fée (dexNo 136)", () => {
    const uko = getSpecies("ukognos")!
    it("existe, mono-Fée, dexNo 136, légendaire caché", () => {
        expect(uko).toBeTruthy()
        expect(uko.types).toEqual(["FEE"])
        expect(uko.dexNo).toBe(136)
        expect(uko.rarity).toBe("LEGENDARY")
        expect(uko.hiddenUntilCaught).toBe(true)
    })
    it("attaquant spécial : le Spécial est sa plus grosse stat", () => {
        const s = uko.baseStats
        const others = [s.hp, s.atk, s.def, s.spe]
        expect(others.every((v) => s.spc >= v)).toBe(true)
        expect(s.spc).toBeGreaterThan(s.atk) // ATQ volontairement molle (pur spécial)
    })
    it("apprend son STAB Fée + set-up Focalisation + auto-soin Repos + capstone niv 90", () => {
        const ids = uko.learnset.map((l) => l.moveId)
        expect(ids).toContain("eclat_lunaire")  // STAB signature Fée
        expect(ids).toContain("focalisation")   // set-up SPÉ +1 (comme Goshendofy)
        expect(ids).toContain("repos")          // auto-soin (parité Goshendofy)
        expect(uko.learnset.find((l) => l.moveId === "cataclysme_lunaire")?.level).toBe(90) // capstone tardif (miroir Gosh niv 95)
    })
    it("AUCUN coup super-efficace vs Poison/Insecte (MEROREM le hard-counter) + couverture GLACE anti-Dragon", () => {
        // Design : Ukognos n'a AUCUNE couverture qui frappe le Poison OU l'Insecte en super-efficace (pas de Feu,
        // pas de Psy) → Merorem (Poison/Insecte) le mure et le tue via son Poison (2× vs Fée).
        for (const l of uko.learnset) {
            const mv = getMove(l.moveId)
            if (!mv?.power) continue // ignore les moves de statut (Repos, Focalisation…)
            expect(typeMultiplier(mv.type, "POISON"), `${mv.id} vs Poison`).toBeLessThanOrEqual(1)
            expect(typeMultiplier(mv.type, "INSECTE"), `${mv.id} vs Insecte`).toBeLessThanOrEqual(1)
        }
        // MAIS il porte une couverture GLACE → 2× vs Dragon (Ukognos > Goshendofy), neutre vs Merorem.
        const ice = uko.learnset.map((l) => getMove(l.moveId)).find((m) => m?.type === "GLACE")
        expect(ice, "un move Glace anti-Dragon").toBeTruthy()
        expect(typeMultiplier("GLACE", "DRAGON")).toBe(2)
    })
})

// SPAWN MIROIR : en NG+, le créneau légendaire des hautes herbes devient Ukognos (au lieu de Goshendofy).
// tier0 band0 = (2,17), dénom légendaire 100 (1/100=0.01) ; rng quasi-nul = tirage le + favorable.
const MAP = "yellow_hautes_herbes"
const DAY = "2026-06-15"
describe("UKOGNOS — spawn miroir RUN 2 (hautes herbes)", () => {
    it("RUN 2 (ngplus) : le légendaire de la plaine EST Ukognos, niv 50, capture gatée Ball≥5 + statut", () => {
        const m = rollWildEncounter({ mapId: MAP, x: 2, y: 17, leadLevel: 10, rng: () => 0.0001, ngplus: true, caughtSpecies: [], dayKey: DAY })
        expect(m?.speciesId).toBe("ukognos")
        expect(m!.level).toBe(50)
        const cfg = m as unknown as { captureMinBallBonus?: number; captureRequiresStatus?: boolean }
        expect(cfg.captureMinBallBonus).toBe(5)
        expect(cfg.captureRequiresStatus).toBe(true)
    })
    it("RUN 1 (hors ngplus) : c'est TOUJOURS Goshendofy, jamais Ukognos", () => {
        const m = rollWildEncounter({ mapId: MAP, x: 2, y: 17, leadLevel: 10, rng: () => 0.0001, goshCaught: false, dayKey: DAY })
        expect(m?.speciesId).toBe("goshendofy")
    })
    it("Ukognos CAPTURÉ en NG+ → ne réapparaît plus (gate Pokédex NG+)", () => {
        const caught = rollWildEncounter({ mapId: MAP, x: 2, y: 17, leadLevel: 10, rng: () => 0.0001, ngplus: true, caughtSpecies: ["ukognos"], dayKey: DAY })
        expect(caught?.speciesId).not.toBe("ukognos")
    })
    it("GAMIN : le boost AUBE double les chances d'Ukognos en NG+", () => {
        // tier0 band0 : dénom 100 (1/100) ; boost ×2 → 50 (1/50). Seuil 0.015 = entre les deux.
        const withBoost = rollWildEncounter({ mapId: MAP, x: 2, y: 17, leadLevel: 10, rng: () => 0.015, ngplus: true, caughtSpecies: [], goshBoost: true, dayKey: DAY })
        const noBoost = rollWildEncounter({ mapId: MAP, x: 2, y: 17, leadLevel: 10, rng: () => 0.015, ngplus: true, caughtSpecies: [], goshBoost: false, dayKey: DAY })
        expect(withBoost?.speciesId).toBe("ukognos")
        expect(noBoost?.speciesId).not.toBe("ukognos")
    })
})

describe("GAMIN — fenêtre AUBE (run 2) vs NUIT (run 1)", () => {
    it("aube = 5h → 10h59 (11h exclu)", () => {
        expect(isHhKidDawn(4)).toBe(false)
        expect(isHhKidDawn(5)).toBe(true)
        expect(isHhKidDawn(10)).toBe(true)
        expect(isHhKidDawn(11)).toBe(false)
        expect(isHhKidDawn(22)).toBe(false)
    })
    it("les deux fenêtres ne se chevauchent jamais", () => {
        for (let h = 0; h < 24; h++) expect(isHhKidDawn(h) && isHhKidNight(h)).toBe(false)
    })
})
