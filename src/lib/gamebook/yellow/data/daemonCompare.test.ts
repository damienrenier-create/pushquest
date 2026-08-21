import { describe, it, expect, beforeEach } from "vitest"
import {
    resetForIntro, sageRespecCost, grantBonusEnergyUncapped, creditDailyReps,
    comparisonConsultPrice, comparisonConsultsUsed, payComparison, getPlayer,
} from "../store/playerStore"
import { hydratePokedex, markSeen, markCaught, recordSeenZone, daemonCompareTier } from "../store/pokedexStore"

// SAGE SAIYAN — repricing : rampe douce « fun » (12,16,…,88/jour), sans multiplicateur de réserve → 20 points/jour
// = 1000 ⚡, donc 40 points (plafond 20/j = 2 jours) = 2000 ⚡ pile.
describe("Sage Saiyan — rampe douce (fun)", () => {
    beforeEach(() => resetForIntro())
    it("une journée pleine (20 points) = 1000 ⚡ ; 2 jours (40 points) = 2000 ⚡", () => {
        expect(sageRespecCost(20, 0)).toBe(1000)
        expect(sageRespecCost(20, 0) + sageRespecCost(20, 0)).toBe(2000) // après reset nocturne, used repart à 0
    })
    it("rampe dans la journée : 1er point = 12, 20e = 88 (ça monte, mais reste abordable)", () => {
        expect(sageRespecCost(1, 0)).toBe(12)   // 1er point du jour
        expect(sageRespecCost(1, 19)).toBe(88)  // 20e point du jour
        expect(sageRespecCost(2, 0)).toBe(12 + 16) // 1er + 2e = 28
    })
})

// DAEMOMANIAQUE — coût de comparaison équipe vs Pokédex : palier dex × 1,5^(compa payantes du jour).
describe("Comparaison — paliers dex", () => {
    beforeEach(() => { resetForIntro(); hydratePokedex({ seen: [], caught: [], seenAt: {}, firstCatch: {} }) })
    it("capturé=20, vu sauvage=50, connu=100, jamais vu=200 (ordre de test respecté)", () => {
        markCaught("mottoche")                       // capturé (implique seen)
        recordSeenZone("lavapetit", "yellow_plage")  // vu à l'état SAUVAGE (implique seen, non capturé)
        markSeen("chenipotil")                       // connu (dresseur/fiche) mais jamais sauvage
        expect(daemonCompareTier("mottoche")).toEqual({ tier: "caught", base: 20 })
        expect(daemonCompareTier("lavapetit")).toEqual({ tier: "wild", base: 50 })
        expect(daemonCompareTier("chenipoil_inconnu")).toEqual({ tier: "unknown", base: 200 })
        expect(daemonCompareTier("chenipotil")).toEqual({ tier: "known", base: 100 })
    })
})

describe("Comparaison — prix escaladant ×1,5 + reset quotidien", () => {
    beforeEach(() => { resetForIntro(); grantBonusEnergyUncapped(20000) }) // solde large (hors-plafond)
    it("×1,5 à chaque compa payante ; payComparison débite + incrémente ; reset la nuit", () => {
        expect(comparisonConsultsUsed()).toBe(0)
        expect(comparisonConsultPrice(100)).toBe(100)          // 1re
        const before = getPlayer().reps
        const r1 = payComparison(100)
        expect(r1).toEqual({ ok: true, cost: 100 })
        expect(getPlayer().reps).toBe(before - 100)            // débité
        expect(comparisonConsultsUsed()).toBe(1)
        expect(comparisonConsultPrice(100)).toBe(150)          // ×1,5
        payComparison(100)                                     // coûte 150
        expect(comparisonConsultsUsed()).toBe(2)
        expect(comparisonConsultPrice(100)).toBe(225)          // ×1,5^2
        creditDailyReps("2099-01-01")                          // nouveau jour → reset
        expect(comparisonConsultsUsed()).toBe(0)
        expect(comparisonConsultPrice(100)).toBe(100)          // prix revenu à la base
    })
    it("solde insuffisant → { ok:false, reason:'reps' } sans rien débiter ni incrémenter", () => {
        resetForIntro() // reps = 0
        const r = payComparison(200)
        expect(r.ok).toBe(false)
        expect(r.reason).toBe("reps")
        expect(comparisonConsultsUsed()).toBe(0) // compteur inchangé sur échec
    })
})
