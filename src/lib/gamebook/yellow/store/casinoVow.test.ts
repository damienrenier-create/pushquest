import { describe, it, expect } from "vitest"
import {
    hydratePlayer, getPlayer, creditDailyReps,
    isCasinoRestricted, casinoBetAllowed, casinoRemainingToday, spendCasinoBet, recordCasinoSpend, casinoDailyCap,
    CASINO_RESTRICTED_MARKER, CASINO_VOW_MAX_BET, CASINO_CAP_START, CASINO_CAP_STEP, CASINO_CAP_MAX,
} from "./playerStore"
import { leagueLevelBonus, LEAGUE_PLUS3_MARKER } from "../data/fusionLeague"

const restrict = (spent = 0, reps = 5000, cap?: number) =>
    hydratePlayer({ reps, repsCap: 100000, repsBankedTotal: 0, defeatedTrainers: [CASINO_RESTRICTED_MARKER], casinoSpentToday: spent, casinoCapToday: cap, creditedThrough: "2026-01-01" })
const free = (reps = 5000) =>
    hydratePlayer({ reps, repsCap: 100000, repsBankedTotal: 0, defeatedTrainers: [], casinoSpentToday: 0 })

describe("Vœu du génie — cap casino (10/mise + plafond quotidien PROGRESSIF 50 → +10/j → 1000)", () => {
    it("constantes", () => { expect(CASINO_VOW_MAX_BET).toBe(10); expect(CASINO_CAP_START).toBe(50); expect(CASINO_CAP_STEP).toBe(10); expect(CASINO_CAP_MAX).toBe(1000) })

    it("non restreint : aucune limite", () => {
        free()
        expect(isCasinoRestricted()).toBe(false)
        expect(casinoBetAllowed(500).ok).toBe(true)
        expect(casinoRemainingToday()).toBe(Infinity)
        expect(casinoDailyCap()).toBe(Infinity)
    })

    it("restreint : mise > 10 refusée, ≤ 10 acceptée", () => {
        restrict()
        expect(isCasinoRestricted()).toBe(true)
        expect(casinoBetAllowed(10).ok).toBe(true)
        expect(casinoBetAllowed(11).ok).toBe(false)
    })

    it("restreint : plafond quotidien PROGRESSIF, défaut 50", () => {
        restrict(45) // cap défaut 50, déjà 45 misés
        expect(casinoDailyCap()).toBe(50)
        expect(casinoRemainingToday()).toBe(5)
        expect(casinoBetAllowed(5).ok).toBe(true)   // 45+5 = 50 → ok
        expect(casinoBetAllowed(6).ok).toBe(false)  // 45+6 > 50 → bloqué
    })

    it("le plafond MONTE de +10/jour (creditDailyReps) et se plafonne à 1000", () => {
        restrict(30, 5000, 90)
        expect(casinoDailyCap()).toBe(90)
        creditDailyReps("2026-01-02") // nouveau jour → cap +10, mise du jour remise à 0
        expect(casinoDailyCap()).toBe(100)
        expect(getPlayer().casinoSpentToday).toBe(0)
        restrict(0, 5000, 995)
        creditDailyReps("2026-02-01")
        expect(casinoDailyCap()).toBe(1000) // 995 + 10 = 1005 → plafonné à 1000
    })

    it("mise cumulée bloque au plafond DU JOUR", () => {
        restrict(0, 100000, 50)
        for (let i = 0; i < 5; i++) expect(spendCasinoBet(10).ok).toBe(true) // 5 × 10 = 50
        expect(getPlayer().casinoSpentToday).toBe(50)
        expect(spendCasinoBet(1).ok).toBe(false) // plafond 50 atteint
    })

    it("spendCasinoBet débite ET incrémente (restreint)", () => {
        restrict(0, 1000, 50)
        expect(spendCasinoBet(10).ok).toBe(true)
        expect(getPlayer().reps).toBe(990)
        expect(getPlayer().casinoSpentToday).toBe(10)
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
