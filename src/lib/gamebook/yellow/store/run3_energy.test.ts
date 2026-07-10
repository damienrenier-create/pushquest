import { describe, it, expect, beforeEach } from "vitest"
import { hydratePlayer, setActiveWorld, getPlayer, grantReps, bankReps, grantBonusEnergyUncapped, spendReps, creditReps, grantRouletteTicket, grantRouletteCredit, rouletteCreditBalance, peekTicketValue } from "./playerStore"

beforeEach(() => {
    setActiveWorld("live")
    hydratePlayer({ reps: 100, repsCap: 6000, repsBankedTotal: 0 })
})

describe("RUN 3 — verrou d'énergie (source unique : 500 + paliers d'arène)", () => {
    it("live : grantReps crédite normalement (aucun verrou)", () => {
        expect(grantReps(50)).toBe(50)
        expect(getPlayer().reps).toBe(150)
    })

    it("run 3 : grantReps SANS force = BLOQUÉ (casino, ACE, sbire, dresseurs, gauntlet → 0)", () => {
        setActiveWorld("run3")
        expect(grantReps(500)).toBe(0)
        expect(getPlayer().reps).toBe(100) // inchangé
    })

    it("run 3 : grantReps AVEC force = autorisé (départ 500 + paliers d'arène)", () => {
        setActiveWorld("run3")
        expect(grantReps(400, true)).toBe(400)
        expect(getPlayer().reps).toBe(500)
    })

    it("run 3 : bankReps (vraies pompes) ne donne AUCUNE énergie (Saiyan uniquement)", () => {
        setActiveWorld("run3")
        bankReps(9999, 0, "2026-07-09")
        expect(getPlayer().reps).toBe(100) // inchangé
    })

    it("run 3 : grantBonusEnergyUncapped (cadeaux hors-plafond) = bloqué", () => {
        setActiveWorld("run3")
        grantBonusEnergyUncapped(1000)
        expect(getPlayer().reps).toBe(100)
    })

    it("run 3 : DÉPENSER de l'énergie (attaques) reste possible → le pool baisse jusqu'à 0", () => {
        setActiveWorld("run3")
        expect(spendReps(30)).toBe(true)
        expect(getPlayer().reps).toBe(70)
    })

    it("live/ngplus : bankReps fonctionne toujours (pas de régression hors run 3)", () => {
        setActiveWorld("live")
        bankReps(80, 0, "2026-07-09") // 80 reps réels − 0 banqué = +80
        expect(getPlayer().reps).toBe(180)
    })

    // --- Fuites corrigées (10/07) : creditReps (cash-out/tuto poker), tickets, crédit roulette ---
    it("run 3 : creditReps (cash-out / tuto poker 100⚡) = BLOQUÉ", () => {
        setActiveWorld("run3")
        expect(creditReps(100)).toBe(0)
        expect(getPlayer().reps).toBe(100) // inchangé
    })

    it("live : creditReps crédite toujours (pas de régression poker hors run 3)", () => {
        setActiveWorld("live")
        expect(creditReps(100)).toBe(100)
        expect(getPlayer().reps).toBe(200)
    })

    it("run 3 : grantRouletteTicket = BLOQUÉ (aucun ticket en file)", () => {
        setActiveWorld("run3")
        grantRouletteTicket(50, "casino")
        expect(peekTicketValue()).toBe(0)
    })

    it("run 3 : grantRouletteCredit (énergie roulette) = BLOQUÉ", () => {
        setActiveWorld("run3")
        grantRouletteCredit(200)
        expect(rouletteCreditBalance()).toBe(0)
    })
})
