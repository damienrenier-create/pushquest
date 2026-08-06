import { describe, it, expect } from "vitest"
import {
    hydratePlayer, getPlayer,
    isCasinoRestricted, casinoBetAllowed, casinoRemainingToday, spendCasinoBet, recordCasinoSpend,
    CASINO_RESTRICTED_MARKER, CASINO_VOW_MAX_BET, CASINO_VOW_MAX_PER_DAY,
} from "./playerStore"
import { leagueLevelBonus, LEAGUE_PLUS3_MARKER } from "../data/fusionLeague"

const restrict = (spent = 0, reps = 5000) =>
    hydratePlayer({ reps, repsCap: 100000, repsBankedTotal: 0, defeatedTrainers: [CASINO_RESTRICTED_MARKER], casinoSpentToday: spent })
const free = (reps = 5000) =>
    hydratePlayer({ reps, repsCap: 100000, repsBankedTotal: 0, defeatedTrainers: [], casinoSpentToday: 0 })

describe("Vœu du génie — cap casino (10/mise + 200/jour)", () => {
    it("constantes", () => { expect(CASINO_VOW_MAX_BET).toBe(10); expect(CASINO_VOW_MAX_PER_DAY).toBe(200) })

    it("non restreint : aucune limite", () => {
        free()
        expect(isCasinoRestricted()).toBe(false)
        expect(casinoBetAllowed(500).ok).toBe(true)
        expect(casinoRemainingToday()).toBe(Infinity)
    })

    it("restreint : mise > 10 refusée, ≤ 10 acceptée", () => {
        restrict()
        expect(isCasinoRestricted()).toBe(true)
        expect(casinoBetAllowed(10).ok).toBe(true)
        expect(casinoBetAllowed(11).ok).toBe(false)
        expect(casinoBetAllowed(50).ok).toBe(false)
    })

    it("restreint : plafond 200/jour", () => {
        restrict(195)
        expect(casinoRemainingToday()).toBe(5)
        expect(casinoBetAllowed(5).ok).toBe(true)   // 195+5 = 200 → ok
        expect(casinoBetAllowed(6).ok).toBe(false)  // 195+6 = 201 > 200 → bloqué par le total/jour
    })

    it("spendCasinoBet débite ET incrémente le compteur (restreint)", () => {
        restrict(0, 1000)
        expect(spendCasinoBet(10).ok).toBe(true)
        expect(getPlayer().reps).toBe(990)
        expect(getPlayer().casinoSpentToday).toBe(10)
        // 2e mise au-dessus du cap → refusée, RIEN débité ni compté
        expect(spendCasinoBet(11).ok).toBe(false)
        expect(getPlayer().reps).toBe(990)
        expect(getPlayer().casinoSpentToday).toBe(10)
    })

    it("spendCasinoBet cumule vers le plafond 200/jour puis bloque", () => {
        restrict(0, 100000)
        for (let i = 0; i < 20; i++) expect(spendCasinoBet(10).ok).toBe(true) // 20 × 10 = 200
        expect(getPlayer().casinoSpentToday).toBe(200)
        expect(spendCasinoBet(1).ok).toBe(false) // plafond atteint
    })

    it("non restreint : spendCasinoBet = simple débit, aucun compteur", () => {
        free(1000)
        expect(spendCasinoBet(300).ok).toBe(true)
        expect(getPlayer().reps).toBe(700)
        expect(getPlayer().casinoSpentToday).toBe(0) // pas de tracking hors vœu
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
