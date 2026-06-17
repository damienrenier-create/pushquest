import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn } from "./engine"
import { createMonInstance } from "./factory"
import { getMove } from "../data/moves"
import { getSpecies } from "../data/species"

describe("Météores — coup sûr (ne rate jamais, traverse l'invulnérabilité)", () => {
    it("move data : NORMAL, accuracy 0 (never-miss), sureHit", () => {
        const m = getMove("meteores")!
        expect(m.type).toBe("NORMAL")
        expect(m.accuracy).toBe(0) // ≤ 0 → hitChance Infinity → ignore esquive/mirage
        expect(m.effect?.sureHit).toBe(true)
    })

    it("touche une cible SOUS TERRE (semiInvuln / Tunnel) au lieu de la manquer", () => {
        const atk = createMonInstance("aquilothan", 50, { owned: true, moveIds: ["meteores"] })
        const def = createMonInstance("tonytony", 50, { owned: false })
        const s0 = createBattle([atk], [def], { isWild: true, seed: 1 })
        s0.enemy.team[s0.enemy.activeIndex].semiInvuln = true // simule une cible enfouie (Tunnel)
        const hp0 = s0.enemy.team[0].currentHp
        const s1 = resolveTurn(s0, { kind: "move", moveIndex: 0 })
        expect(s1.enemy.team[0].currentHp).toBeLessThan(hp0) // a bien touché malgré l'invulnérabilité
    })

    it("un move ORDINAIRE, lui, manque une cible sous terre (contrôle)", () => {
        const atk = createMonInstance("aquilothan", 50, { owned: true, moveIds: ["charge"] })
        const def = createMonInstance("tonytony", 50, { owned: false })
        const s0 = createBattle([atk], [def], { isWild: true, seed: 1 })
        s0.enemy.team[s0.enemy.activeIndex].semiInvuln = true
        const hp0 = s0.enemy.team[0].currentHp
        const s1 = resolveTurn(s0, { kind: "move", moveIndex: 0 })
        expect(s1.enemy.team[0].currentHp).toBe(hp0) // Charge manque la cible enfouie
    })

    it("Aquilothan et Divinpâte apprennent Météores ; Divinpâte a aussi Éveil Divin (snowball)", () => {
        expect(getSpecies("aquilothan")!.learnset.some((l) => l.moveId === "meteores")).toBe(true)
        expect(getSpecies("divinpate")!.learnset.some((l) => l.moveId === "meteores")).toBe(true)
        const e = getMove("eveil_divin")!
        expect(e.type).toBe("PSY")
        expect(e.power).toBe(90)
        expect(e.effect?.statChanges?.[0]).toEqual({ target: "self", stat: "spc", stages: 1 })
        expect(getSpecies("divinpate")!.learnset.some((l) => l.moveId === "eveil_divin")).toBe(true)
    })
})
