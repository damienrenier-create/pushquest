import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn, maxHpOf } from "./engine"
import { createMonInstance } from "./factory"
import { getSpecies } from "../data/species"
import { getMove } from "../data/moves"
import { getItem } from "../data/items"
import { orcalineLevelForWins } from "../store/playerStore"

// Met Goshendofy (niv 50) face au joueur, PV réglés à une fraction de son max.
function goshBattle(hpFrac: number) {
    const gosh = createMonInstance("goshendofy", 50, { owned: false })
    const me = createMonInstance("orcaline", 50, { owned: true })
    const s = createBattle([me], [gosh], { isWild: true, seed: 777 })
    const wild = s.enemy.team[s.enemy.activeIndex]
    wild.currentHp = Math.max(1, Math.floor(maxHpOf(wild) * hpFrac))
    return s
}

describe("Orcaline — espèce, escalade du dresseur, Super Méga Nexus-Ball", () => {
    it("espèce GLACE/EAU dexNo 132, BST 465, learnset (Souffle Polaire 40, Ultralaser 81), mono-stade", () => {
        const o = getSpecies("orcaline")!
        expect(o.types).toEqual(["GLACE", "EAU"])
        expect(o.dexNo).toBe(132)
        const b = o.baseStats
        expect(b.hp + b.atk + b.def + b.spe + b.spc).toBe(465)
        expect(b.spe).toBeGreaterThan(90) // outspeed Goshendofy (90)
        const lvlOf = (id: string) => o.learnset.find((l) => l.moveId === id)?.level
        expect(lvlOf("souffle_polaire")).toBe(40)
        expect(lvlOf("ultralaser")).toBe(81)
        expect(o.evolution).toBeFalsy()
    })

    it("Ultralaser : NORMAL, puissance 150, contrecoup", () => {
        const u = getMove("ultralaser")!
        expect(u.type).toBe("NORMAL")
        expect(u.power).toBe(150)
        expect(u.effect?.recoilPct).toBeGreaterThan(0)
    })

    it("escalade du dresseur : 35, +10/victoire, cap 100 (palier ball = 95 à la 6e victoire)", () => {
        expect(orcalineLevelForWins(0)).toBe(35)
        expect(orcalineLevelForWins(1)).toBe(45)
        expect(orcalineLevelForWins(6)).toBe(95)
        expect(orcalineLevelForWins(7)).toBe(100)
        expect(orcalineLevelForWins(20)).toBe(100)
    })

    it("Super Méga Nexus-Ball : objet BALL, bonus 6", () => {
        const b = getItem("super_mega_nexus_ball")!
        expect(b.category).toBe("BALL")
        expect(b.ballBonus).toBe(6)
    })

    it("capture GARANTIE de Goshendofy sous 50% PV (shunte le verrou de statut)", () => {
        const s = resolveTurn(goshBattle(0.4), { kind: "ball", itemId: "super_mega_nexus_ball" })
        expect(s.outcome).toBe("caught")
    })

    it("PAS garantie si Goshendofy ≥ 50% PV (verrou de statut sans statut majeur)", () => {
        const s = resolveTurn(goshBattle(1), { kind: "ball", itemId: "super_mega_nexus_ball" })
        expect(s.outcome).not.toBe("caught")
    })

    it("une Ball ordinaire ne capture PAS Goshendofy sous 50% sans statut (verrou actif)", () => {
        const s = resolveTurn(goshBattle(0.4), { kind: "ball", itemId: "hyper_ball_plus" })
        expect(s.outcome).not.toBe("caught")
    })
})
