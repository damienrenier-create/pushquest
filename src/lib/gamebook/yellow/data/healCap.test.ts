import { describe, it, expect } from "vitest"
import { ENEMY_MAX_HEALS, healCapApplies, healAllowed } from "./healCap"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// PLAFOND DE RÉGÉNÉRATION
//
// Ce plafond existe parce qu'un joueur s'est retrouvé ENFERMÉ dans un combat (Kingme, 02/10) : l'adversaire se
// soignait plus vite qu'il ne pouvait frapper, un combat de dresseur ne se fuit pas, et l'instantané le remettait
// dedans à chaque rechargement. Deux choses à ne jamais casser ici :
//   (1) le JOUEUR n'est pas plafonné — ce n'est pas lui le problème ;
//   (2) le PvP n'est pas plafonné — les deux clients simulent le combat, un plafond d'un seul côté les désynchronise.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

describe("à qui le plafond s'applique-t-il ?", () => {
    it("au dresseur (camp ennemi) en PvE : oui", () => {
        expect(healCapApplies("enemy", false)).toBe(true)
    })

    it("⚠️ au JOUEUR : jamais — ses soins restent intacts", () => {
        expect(healCapApplies("player", false)).toBe(false)
        expect(healCapApplies("player", true)).toBe(false)
    })

    it("⚠️ en PvP : jamais — sinon les deux clients divergent", () => {
        expect(healCapApplies("enemy", true)).toBe(false)
    })
})

describe("combien de régénérations ?", () => {
    it("trois, pas quatre", () => {
        expect(ENEMY_MAX_HEALS).toBe(3)
        expect(healAllowed(0, true)).toBe(true)
        expect(healAllowed(1, true)).toBe(true)
        expect(healAllowed(2, true)).toBe(true)
        expect(healAllowed(3, true)).toBe(false)
        expect(healAllowed(99, true)).toBe(false)
    })

    it("un compteur absent vaut zéro (un Daemon frais a droit à ses trois soins)", () => {
        expect(healAllowed(undefined, true)).toBe(true)
    })

    it("hors plafond, le soin est toujours permis quel que soit le compteur", () => {
        for (const n of [0, 3, 50, undefined]) expect(healAllowed(n, false), String(n)).toBe(true)
    })

    it("un compteur absurde ne rouvre pas le robinet", () => {
        for (const n of [-1, NaN, 2.9]) {
            // -1 et NaN -> ramenés à 0 (soin permis) ; 2.9 -> 2 (permis). Aucun ne doit DÉPASSER le plafond.
            expect(typeof healAllowed(n, true)).toBe("boolean")
        }
        expect(healAllowed(3.9, true)).toBe(false) // 3.9 -> 3 : plafond atteint, pas contourné
    })
})
