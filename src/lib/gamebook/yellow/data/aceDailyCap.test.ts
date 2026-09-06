import { describe, it, expect, beforeEach } from "vitest"
import { hydratePlayer, aceAvailableToday, recordAceDefeat, applyAcceptedGenieWishEffects, getPlayer } from "../store/playerStore"
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

    it("vœu ACE 7×/jour : jusqu'à 7 victoires le même jour, puis bloqué", () => {
        expect(applyAcceptedGenieWishEffects({ accepted1: true, effect1: JSON.stringify({ kind: "ace_daily_cap" }) })).toBe(true)
        for (let i = 0; i < 7; i++) {
            expect(aceAvailableToday()).toBe(true)
            recordAceDefeat(50, FIRE, 50)
        }
        expect(aceAvailableToday()).toBe(false) // 7 faites aujourd'hui
        expect(getPlayer().aceWins).toBe(7)     // Panthéon débloqué (ACE_PANTHEON_WIN)
    })

    it("boosté : un nouveau jour remet le compteur à zéro", () => {
        applyAcceptedGenieWishEffects({ accepted1: true, effect1: JSON.stringify({ kind: "ace_daily_cap" }) })
        for (let i = 0; i < 7; i++) recordAceDefeat(50, FIRE, 50)
        expect(aceAvailableToday()).toBe(false)
        // Jour suivant : on garde les marqueurs (boost + compteur d'hier), on avance la date → compteur du jour = 0.
        const dt = getPlayer().defeatedTrainers
        hydratePlayer({ team: [], pc: [], items: {}, creditedThrough: "2026-09-07", aceWins: 7, aceDefeatedDate: DAY, defeatedTrainers: dt })
        expect(aceAvailableToday()).toBe(true)
    })
})
