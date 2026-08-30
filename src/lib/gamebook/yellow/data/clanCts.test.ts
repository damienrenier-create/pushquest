import { describe, it, expect } from "vitest"
import { getMove } from "./moves"
import { getSpecies } from "./species"
import { getCt, canLearnCt, CLAN_CT_IDS, run2BlackjackCtPool } from "./cts"
import { ctRewardOptions } from "../frontier/rewards"
import { ctDefiOptions } from "./labDefis"
import { createBattle, resolveTurn } from "../battle/engine"
import { createMonInstance } from "../battle/factory"
import type { PokeType } from "../battle/types"

// CT des 3 clans (Chapelle de Nouillon) : 4 signatures uniques + 3 effets moteur inédits
// (tri-aléatoire Impact, override d'efficacité Transcendance, bouclier→soin Cristallisation).

describe("CT des clans — les 4 moves signatures", () => {
    it("Œil du Cyclone : VOL, 30 pw, Vit +1 & Esquive +1 (soi)", () => {
        const m = getMove("oeil_du_cyclone")!
        expect(m.type).toBe("VOL"); expect(m.power).toBe(30)
        expect(m.effect?.statChanges).toEqual([
            { target: "self", stat: "spe", stages: 1 },
            { target: "self", stat: "eva", stages: 1 },
        ])
    })
    it("Impact : COMBAT, 70 pw / 90 acc, oneOf = apeur / paralysie / Atq +1", () => {
        const m = getMove("impact")!
        expect(m.type).toBe("COMBAT"); expect(m.power).toBe(70); expect(m.accuracy).toBe(90)
        const oneOf = m.effect?.oneOf
        expect(oneOf).toHaveLength(3)
        expect(oneOf!.some((e) => e.flinch)).toBe(true)
        expect(oneOf!.some((e) => e.inflictStatus === "PARALYSIS")).toBe(true)
        expect(oneOf!.some((e) => e.statChanges?.[0]?.stat === "atk" && e.statChanges[0].stages === 1)).toBe(true)
    })
    it("Cristallisation : ROCHE, statut (power 0), 80 acc, selfVolatile CRYSTAL", () => {
        const m = getMove("cristallisation")!
        expect(m.type).toBe("ROCHE"); expect(m.power).toBe(0); expect(m.accuracy).toBe(80)
        expect(m.effect?.selfVolatile).toBe("CRYSTAL")
    })
    it("Transcendance : COMBAT nominal + displayType, physique, noStab, 100 pw", () => {
        const m = getMove("transcendance")!
        expect(m.power).toBe(100); expect(m.category).toBe("PHYSICAL")
        expect(m.displayType).toBe("Transcendance")
        expect(m.effect?.noStab).toBe(true)
    })
})

describe("Transcendance — efficacité SUR-MESURE (override)", () => {
    const ov = getMove("transcendance")!.effect!.effectivenessOverride!
    const eff = (types: PokeType[]) => types.reduce((m, t) => m * (ov[t] ?? 1), 1)
    it("×2 contre Vol, Roche, Combat", () => {
        expect(eff(["VOL"])).toBe(2); expect(eff(["ROCHE"])).toBe(2); expect(eff(["COMBAT"])).toBe(2)
    })
    it("×0.5 contre Plante/Insecte/Glace/Normal/Métal/Ténèbres", () => {
        for (const t of ["PLANTE", "INSECTE", "GLACE", "NORMAL", "METAL", "TENEBRES"] as PokeType[]) expect(eff([t])).toBe(0.5)
    })
    it("×1 (neutre, AUCUNE immunité) contre le reste", () => {
        for (const t of ["FEU", "EAU", "ELEC", "POISON", "SOL", "PSY", "SPECTRE", "DRAGON", "FEE"] as PokeType[]) expect(eff([t])).toBe(1)
    })
    it("produit sur les doubles-types : Vol/Roche = ×4 · Normal/Vol = ×1 (0.5×2)", () => {
        expect(eff(["VOL", "ROCHE"])).toBe(4)
        expect(eff(["NORMAL", "VOL"])).toBe(1)
    })
})

describe("CT des clans — catalogue + exclusivité TOTALE", () => {
    it("ct67-70 : existent, gift, prix 0, bons moves", () => {
        expect(getCt("ct67")!.moveId).toBe("oeil_du_cyclone")
        expect(getCt("ct68")!.moveId).toBe("impact")
        expect(getCt("ct69")!.moveId).toBe("cristallisation")
        expect(getCt("ct70")!.moveId).toBe("transcendance")
        for (const id of CLAN_CT_IDS) { const c = getCt(id)!; expect(c.gift).toBe(true); expect(c.price).toBe(0) }
    })
    it("INTROUVABLES ailleurs : ni blackjack run 2, ni Zone de Combat, ni défi labo", () => {
        const bj = new Set(run2BlackjackCtPool())
        const labo = new Set(ctDefiOptions().map((o) => o.ctId))
        for (const id of CLAN_CT_IDS) {
            expect(bj.has(id)).toBe(false)
            expect(labo.has(id)).toBe(false)
        }
        expect(ctRewardOptions("maitrezenc", 100).some((id) => CLAN_CT_IDS.includes(id))).toBe(false)
    })
})

describe("Apprentissage des CT de clan (canLearnCt)", () => {
    const vol = getSpecies("aquilord")!, combat = getSpecies("maitrezenc")!, roche = getSpecies("rocosaure")!, feu = getSpecies("pyropanthe")!
    it("CT de niv 50 : réservées au type de leur clan", () => {
        expect(canLearnCt(vol, getCt("ct67")!)).toBe(true)     // Œil du Cyclone (VOL)
        expect(canLearnCt(combat, getCt("ct67")!)).toBe(false)
        expect(canLearnCt(combat, getCt("ct68")!)).toBe(true)  // Impact (COMBAT)
        expect(canLearnCt(vol, getCt("ct68")!)).toBe(false)
        expect(canLearnCt(roche, getCt("ct69")!)).toBe(true)   // Cristallisation (ROCHE)
        expect(canLearnCt(combat, getCt("ct69")!)).toBe(false)
    })
    it("Transcendance (ct70) : apprenable Vol/Roche/Combat, PAS les autres types", () => {
        expect(canLearnCt(vol, getCt("ct70")!)).toBe(true)
        expect(canLearnCt(combat, getCt("ct70")!)).toBe(true)
        expect(canLearnCt(roche, getCt("ct70")!)).toBe(true)
        expect(canLearnCt(feu, getCt("ct70")!)).toBe(false)
    })
})

describe("Cristallisation — l'attaque encaissée devient SOIN (moteur)", () => {
    it("un défenseur avec le bouclier CRYSTAL est SOIGNÉ par l'attaque (pas blessé), puis le bouclier est consommé", () => {
        const atk = createMonInstance("aquilothan", 50, { owned: true, moveIds: ["charge"] })
        const def = createMonInstance("tonytony", 50, { owned: false })
        const s0 = createBattle([atk], [def], { isWild: true, seed: 1 })
        const enemy = s0.enemy.team[s0.enemy.activeIndex]
        enemy.currentHp = Math.max(1, Math.floor(enemy.currentHp / 2)) // marge pour voir le soin
        enemy.volatiles.CRYSTAL = 1
        const hp0 = enemy.currentHp
        const s1 = resolveTurn(s0, { kind: "move", moveIndex: 0 })
        expect(s1.enemy.team[0].currentHp).toBeGreaterThan(hp0)        // soigné au lieu d'être blessé
        expect(s1.enemy.team[0].volatiles.CRYSTAL).toBeUndefined()     // bouclier consommé (une seule attaque)
    })
})
