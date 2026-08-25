import { describe, it, expect } from "vitest"
import {
    hydratePlayer, getPlayer, creditDailyReps,
    isCasinoRestricted, casinoBetAllowed, casinoRemainingToday, spendCasinoBet, recordCasinoSpend, casinoDailyCap,
    CASINO_RESTRICTED_MARKER, CASINO_VOW_MAX_BET, CASINO_DAILY_CAP,
} from "./playerStore"
import { leagueLevelBonus, LEAGUE_PLUS3_MARKER } from "../data/fusionLeague"

const restrict = (spent = 0, reps = 5000, cap?: number) =>
    hydratePlayer({ reps, repsCap: 100000, repsBankedTotal: 0, defeatedTrainers: [CASINO_RESTRICTED_MARKER], casinoSpentToday: spent, casinoCapToday: cap, creditedThrough: "2026-01-01" })
const free = (reps = 5000) =>
    hydratePlayer({ reps, repsCap: 100000, repsBankedTotal: 0, defeatedTrainers: [], casinoSpentToday: 0 })

describe("Vœu du génie — cap casino ASSOUPLI (mise ≤ 250 + plafond FLAT 250/jour)", () => {
    it("constantes", () => { expect(CASINO_VOW_MAX_BET).toBe(250); expect(CASINO_DAILY_CAP).toBe(250) })

    it("non restreint : aucune limite", () => {
        free()
        expect(isCasinoRestricted()).toBe(false)
        expect(casinoBetAllowed(5000).ok).toBe(true)
        expect(casinoRemainingToday()).toBe(Infinity)
        expect(casinoDailyCap()).toBe(Infinity)
    })

    it("restreint : mise > 250 refusée, ≤ 250 acceptée", () => {
        restrict()
        expect(isCasinoRestricted()).toBe(true)
        expect(casinoBetAllowed(250).ok).toBe(true)
        expect(casinoBetAllowed(251).ok).toBe(false)
    })

    it("plafond FLAT 250/jour, INDÉPENDANT de l'ancien casinoCapToday (Jacanon retrouve 250 direct)", () => {
        restrict(0, 5000, 90) // ancien cap progressif bas (90) → désormais ignoré
        expect(casinoDailyCap()).toBe(250)
        expect(casinoRemainingToday()).toBe(250)
        restrict(200, 5000, 30)
        expect(casinoRemainingToday()).toBe(50)      // 250 - 200
        expect(casinoBetAllowed(50).ok).toBe(true)   // 200+50 = 250 → ok
        expect(casinoBetAllowed(51).ok).toBe(false)  // 200+51 > 250 → bloqué
    })

    it("le plafond NE monte PLUS avec les jours (flat), la mise du jour se remet à 0", () => {
        restrict(120, 5000, 90)
        expect(casinoDailyCap()).toBe(250)
        creditDailyReps("2026-01-02") // nouveau jour → mise du jour remise à 0, cap toujours 250
        expect(casinoDailyCap()).toBe(250)
        expect(getPlayer().casinoSpentToday).toBe(0)
    })

    it("mise cumulée bloque au plafond DU JOUR (250)", () => {
        restrict(0, 100000)
        for (let i = 0; i < 5; i++) expect(spendCasinoBet(50).ok).toBe(true) // 5 × 50 = 250
        expect(getPlayer().casinoSpentToday).toBe(250)
        expect(spendCasinoBet(1).ok).toBe(false) // plafond 250 atteint
    })

    it("spendCasinoBet débite ET incrémente (restreint)", () => {
        restrict(0, 1000)
        expect(spendCasinoBet(100).ok).toBe(true)
        expect(getPlayer().reps).toBe(900)
        expect(getPlayer().casinoSpentToday).toBe(100)
    })

    it("non restreint : spendCasinoBet = simple débit, aucun compteur", () => {
        free(1000)
        expect(spendCasinoBet(300).ok).toBe(true)
        expect(getPlayer().reps).toBe(700)
        expect(getPlayer().casinoSpentToday).toBe(0)
    })

    it("recordCasinoSpend : no-op hors vœu", () => {
        free()
        recordCasinoSpend(50)
        expect(getPlayer().casinoSpentToday).toBe(0)
    })
})

describe("Vœu du génie — Ligue +3", () => {
    it("leagueLevelBonus : +3 si marqueur, 0 sinon", () => {
        expect(leagueLevelBonus((m) => m === LEAGUE_PLUS3_MARKER)).toBe(3)
        expect(leagueLevelBonus(() => false)).toBe(0)
    })
})
