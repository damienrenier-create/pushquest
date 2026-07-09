import { describe, it, expect, beforeEach } from "vitest"
import { hydratePlayer, setActiveWorld, getPlayer, grantReps, bankReps, grantBonusEnergyUncapped, spendReps } from "./playerStore"

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
})
