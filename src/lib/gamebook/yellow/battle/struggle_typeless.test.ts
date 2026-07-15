import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn } from "./engine"
import { createMonInstance } from "./factory"

// Anti soft-lock : à court d'énergie, le joueur n'a que la Charge Désespérée (NORMAL). Face à un SPECTRE
// (Normal ×0), sans typeless le combat ne pouvait jamais se conclure. La Lutte doit être TYPELESS (façon Gen 1).
describe("Charge Désespérée (Lutte) = TYPELESS", () => {
    it("inflige des dégâts à un SPECTRE (immunité Normal ignorée) → le combat peut se terminer", () => {
        const atk = createMonInstance("razmaree", 50, { owned: true, moveIds: ["charge_desesperee"] })
        const def = createMonInstance("brookhante", 50, { owned: false, moveIds: ["leche"] }) // SPECTRE, move sans soin
        const s0 = createBattle([atk], [def], { isWild: true, seed: 1 })
        const hp0 = s0.enemy.team[0].currentHp
        const s1 = resolveTurn(s0, { kind: "move", moveIndex: 0 })
        expect(s1.enemy.team[0].currentHp).toBeLessThan(hp0)
    })

    it("contrôle : une attaque NORMALE ordinaire (Charge) reste ×0 sur un Spectre", () => {
        const atk = createMonInstance("razmaree", 50, { owned: true, moveIds: ["charge"] })
        const def = createMonInstance("brookhante", 50, { owned: false, moveIds: ["leche"] })
        const s0 = createBattle([atk], [def], { isWild: true, seed: 1 })
        const hp0 = s0.enemy.team[0].currentHp
        const s1 = resolveTurn(s0, { kind: "move", moveIndex: 0 })
        expect(s1.enemy.team[0].currentHp).toBe(hp0) // immunité de type intacte pour les vraies attaques Normal
    })
})
