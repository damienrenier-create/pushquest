import { describe, it, expect, beforeEach } from "vitest"
import { hydratePlayer, aceAvailableToday, recordAceDefeat, recordAceStreakLoss, applyAcceptedGenieWishEffects, getPlayer } from "../store/playerStore"
import type { PokeType } from "../battle/types"

// VŒU GÉNIE « ACE 7×/jour » (Rob) : l'effet ace_daily_cap lève le plafond quotidien de victoires ACE de 1 à 7.
// Compteur via marqueur journalier borné (auto-reset au change de jour). Les autres joueurs restent à 1/jour.
const FIRE: PokeType[] = ["FEU"]
const DAY = "2026-09-06"

describe("ACE — plafond quotidien de victoires", () => {
    beforeEach(() => hydratePlayer({ team: [], pc: [], items: {}, creditedThrough: DAY, aceWins: 0, aceDefeatedDate: "", defeatedTrainers: [] }))

    it("normal : 1 victoire/jour (règle historique inchangée)", () => {
        expect(aceAvailableToday()).toBe(true)
        recordAceDefeat(50, FIRE, 50)
        expect(aceAvailableToday()).toBe(false)
    })

    it("vœu ACE 7×/jour : enchaînable jusqu'à 7 victoires (série), puis bloqué (Panthéon obtenu)", () => {
        expect(applyAcceptedGenieWishEffects({ accepted1: true, effect1: JSON.stringify({ kind: "ace_daily_cap" }) })).toBe(true)
        for (let i = 0; i < 7; i++) {
            expect(aceAvailableToday()).toBe(true)
            recordAceDefeat(50, FIRE, 50)
        }
        expect(aceAvailableToday()).toBe(false) // série = 7 → Panthéon obtenu, plus d'ACE
        expect(getPlayer().aceWins).toBe(7)     // ACE_PANTHEON_WIN
    })

    it("boosté : PERDRE contre ACE remet la série (aceWins) à zéro → 7 d'affilée requis", () => {
        applyAcceptedGenieWishEffects({ accepted1: true, effect1: JSON.stringify({ kind: "ace_daily_cap" }) })
        recordAceDefeat(50, FIRE, 50)
        recordAceDefeat(50, FIRE, 50)
        recordAceDefeat(50, FIRE, 50)
        expect(getPlayer().aceWins).toBe(3)
        expect(recordAceStreakLoss()).toBe(true) // défaite → série cassée
        expect(getPlayer().aceWins).toBe(0)
    })

    it("NON boosté : perdre contre ACE ne casse RIEN (série cumulative historique)", () => {
        recordAceDefeat(50, FIRE, 50)
        recordAceDefeat(50, FIRE, 50)
        expect(getPlayer().aceWins).toBe(2)
        expect(recordAceStreakLoss()).toBe(false) // pas de boost → aucun reset
        expect(getPlayer().aceWins).toBe(2)
    })

    it("boosté : la série PERSISTE d'un jour à l'autre tant qu'on ne perd pas", () => {
        applyAcceptedGenieWishEffects({ accepted1: true, effect1: JSON.stringify({ kind: "ace_daily_cap" }) })
        recordAceDefeat(50, FIRE, 50); recordAceDefeat(50, FIRE, 50); recordAceDefeat(50, FIRE, 50) // série = 3
        const dt = getPlayer().defeatedTrainers
        // Jour suivant, série conservée (pas de défaite) → toujours affrontable (3 < 7), il continue là où il s'était arrêté.
        hydratePlayer({ team: [], pc: [], items: {}, creditedThrough: "2026-09-07", aceWins: 3, aceDefeatedDate: DAY, defeatedTrainers: dt })
        expect(aceAvailableToday()).toBe(true)
    })
})
