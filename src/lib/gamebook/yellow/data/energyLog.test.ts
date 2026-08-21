import { describe, it, expect, beforeEach } from "vitest"
import { parseSave, emptySave, ENERGY_LOG_MAX } from "../storage/save"
import { logEnergyIncome, getPlayer, resetForIntro } from "../store/playerStore"

// JOURNAL D'ÉNERGIE — les entrées {ts, source, amount} sont PERSISTÉES (per-monde), affichées dans le calepin.
// Champ OPTIONNEL/ADDITIF : parseSave défensif (ancienne save sans le champ = undefined, valeurs hostiles filtrées),
// source tronquée à 24 car (anti-bloat), amount tronqué (Math.trunc), borné aux ENERGY_LOG_MAX plus récentes.
describe("energyLog — persistance (parseSave)", () => {
    it("ancienne save (champ absent) → undefined ; non-tableau → undefined", () => {
        expect(emptySave().energyLog).toBeUndefined()
        expect(parseSave({}).energyLog).toBeUndefined()
        expect(parseSave({ energyLog: "x" as unknown as [] }).energyLog).toBeUndefined()
    })

    it("filtre les entrées invalides, tronque source (24) + amount (entier), garde les valides", () => {
        const parsed = parseSave({
            energyLog: [
                { ts: 1000, source: "🏋️ Sport", amount: 50 },        // ok
                { ts: 2000, source: "x".repeat(40), amount: 12.9 },   // source tronquée à 24, amount tronqué à 12
                { ts: "nope", source: "y", amount: 5 },               // ts non-number → filtré
                { ts: 3000, source: 7, amount: 5 },                   // source non-string → filtré
                { ts: 4000, source: "z", amount: "big" },             // amount non-number → filtré
                { ts: Infinity, source: "inf", amount: 5 },           // ts non fini → filtré
                null,                                                 // → filtré
            ] as unknown as [],
        })
        expect(parsed.energyLog).toEqual([
            { ts: 1000, source: "🏋️ Sport", amount: 50 },
            { ts: 2000, source: "x".repeat(24), amount: 12 },
        ])
    })

    it("borne aux ENERGY_LOG_MAX PLUS RÉCENTES (les plus anciennes tombent)", () => {
        const big = Array.from({ length: ENERGY_LOG_MAX + 40 }, (_, i) => ({ ts: i, source: "s", amount: 1 }))
        const parsed = parseSave({ energyLog: big as unknown as [] })
        expect(parsed.energyLog).toHaveLength(ENERGY_LOG_MAX)
        expect(parsed.energyLog![0].ts).toBe(40)                     // les 40 premières (les plus anciennes) sont tombées
        expect(parsed.energyLog![ENERGY_LOG_MAX - 1].ts).toBe(ENERGY_LOG_MAX + 39)
    })
})

describe("energyLog — enregistrement (logEnergyIncome)", () => {
    beforeEach(() => resetForIntro())

    it("append une entrée {source, amount} (source tronquée 24) ; ignore amount ≤ 0", () => {
        logEnergyIncome("🏋️ Sport", 50)
        logEnergyIncome("rien", 0)      // 0 → ignoré (pas une entrée)
        logEnergyIncome("perte", -5)    // négatif → ignoré
        logEnergyIncome("x".repeat(40), 3.9) // source tronquée, amount tronqué
        const log = getPlayer().energyLog!
        expect(log.map((e) => ({ source: e.source, amount: e.amount }))).toEqual([
            { source: "🏋️ Sport", amount: 50 },
            { source: "x".repeat(24), amount: 3 },
        ])
        expect(typeof log[0].ts).toBe("number")
    })

    it("borne à ENERGY_LOG_MAX (les plus anciennes tombent)", () => {
        for (let i = 0; i < ENERGY_LOG_MAX + 25; i++) logEnergyIncome(`s${i}`, 1)
        const log = getPlayer().energyLog!
        expect(log).toHaveLength(ENERGY_LOG_MAX)
        expect(log[0].source).toBe("s25")                            // les 25 premières sont tombées
        expect(log[ENERGY_LOG_MAX - 1].source).toBe(`s${ENERGY_LOG_MAX + 24}`)
    })
})
