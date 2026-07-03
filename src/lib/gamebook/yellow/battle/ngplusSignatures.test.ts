import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn } from "./engine"
import { createMonInstance } from "./factory"

// Punching-ball : très encaissant, ne fait AUCUN dégât (Carapace Diamant = statut 0 dégât) → survit longtemps
// et ne KO jamais le joueur. Parfait pour observer les compteurs sans variance RNG.
const dummy = (level = 80) => createMonInstance("amadiam", level, { moveIds: ["carapace_diamant"] })

describe("Frappe Atlas — dégâts fixes = niveau du lanceur", () => {
    it("inflige EXACTEMENT le niveau du lanceur en dégâts", () => {
        const s0 = createBattle([createMonInstance("amadiam", 53, { moveIds: ["frappe_atlas"] })], [dummy(80)], { isWild: true, seed: 42 })
        const before = s0.enemy.team[0].currentHp
        const s1 = resolveTurn(s0, { kind: "move", moveIndex: 0 })
        expect(before - s1.enemy.team[0].currentHp).toBe(53)
    })

    it("ne fait RIEN à un Vol (immunité SOL ×0)", () => {
        const s0 = createBattle([createMonInstance("amadiam", 53, { moveIds: ["frappe_atlas"] })], [createMonInstance("plumiot", 40, { moveIds: ["charge"] })], { isWild: true, seed: 7 })
        const before = s0.enemy.team[0].currentHp
        const s1 = resolveTurn(s0, { kind: "move", moveIndex: 0 })
        expect(s1.enemy.team[0].currentHp).toBe(before) // 0 dégât
    })
})

describe("Essaim Vorace — frénésie croissante (compteur swarmStacks)", () => {
    const attacker = () => createMonInstance("regnantaur", 45, { moveIds: ["essaim_vorace", "dard_mortel"] })

    it("le compteur monte 0→1→2 sur coups consécutifs, puis retombe à 0 si on change d'attaque", () => {
        let s = createBattle([attacker()], [dummy(80)], { isWild: true, seed: 3 })
        s = resolveTurn(s, { kind: "move", moveIndex: 0 }) // Essaim #1
        expect(s.player.team[0].swarmStacks).toBe(1)
        s = resolveTurn(s, { kind: "move", moveIndex: 0 }) // Essaim #2
        expect(s.player.team[0].swarmStacks).toBe(2)
        s = resolveTurn(s, { kind: "move", moveIndex: 1 }) // Dard Mortel (autre move) → reset
        expect(s.player.team[0].swarmStacks).toBe(0)
    })

    it("le compteur plafonne à 5 (drain 70%) après de nombreux coups", () => {
        let s = createBattle([attacker()], [dummy(90)], { isWild: true, seed: 5 })
        for (let i = 0; i < 7; i++) s = resolveTurn(s, { kind: "move", moveIndex: 0 })
        expect(s.player.team[0].swarmStacks).toBe(5)
    })
})
