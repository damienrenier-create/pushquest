import { describe, it, expect } from "vitest"
import { RUN3_FEATS, evaluateRun3Feats, type Run3FeatInput } from "./run3Feats"

const empty: Run3FeatInput = { caughtThisRun: [], badges: [], isChampion: false, ownedCts: [], domeChampionships: 0 }

describe("run3Feats — guide du concours", () => {
    it("aucun jalon atteint sur une save vierge", () => {
        const r = evaluateRun3Feats(empty)
        expect(r.earnedCount).toBe(0)
        expect(r.feats).toHaveLength(RUN3_FEATS.length)
        expect(r.feats.every((f) => !f.earned)).toBe(true)
    })

    it("ids uniques", () => {
        const ids = RUN3_FEATS.map((f) => f.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it("1re capture débloque r3_start mais pas les paliers dex", () => {
        const r = evaluateRun3Feats({ ...empty, caughtThisRun: ["pikachu"] })
        expect(r.feats.find((f) => f.id === "r3_start")?.earned).toBe(true)
        expect(r.feats.find((f) => f.id === "r3_dex10")?.earned).toBe(false)
    })

    it("paliers dex 10 / 30", () => {
        const ten = Array.from({ length: 10 }, (_, k) => `sp${k}`)
        expect(evaluateRun3Feats({ ...empty, caughtThisRun: ten }).feats.find((f) => f.id === "r3_dex10")?.earned).toBe(true)
        expect(evaluateRun3Feats({ ...empty, caughtThisRun: ten }).feats.find((f) => f.id === "r3_dex30")?.earned).toBe(false)
        const thirty = Array.from({ length: 30 }, (_, k) => `sp${k}`)
        expect(evaluateRun3Feats({ ...empty, caughtThisRun: thirty }).feats.find((f) => f.id === "r3_dex30")?.earned).toBe(true)
    })

    it("arènes lues depuis badges", () => {
        const r = evaluateRun3Feats({ ...empty, badges: ["plante", "feu"] })
        expect(r.feats.find((f) => f.id === "r3_plante")?.earned).toBe(true)
        expect(r.feats.find((f) => f.id === "r3_feu")?.earned).toBe(true)
        expect(r.feats.find((f) => f.id === "r3_eau")?.earned).toBe(false)
    })

    it("légendaires / némésis / donjon / dôme / sacre", () => {
        const full: Run3FeatInput = {
            caughtThisRun: ["flamarokto", "onirail", "condombre", "karmaki"],
            badges: ["plante", "roche", "feu", "elec", "eau"],
            isChampion: true,
            ownedCts: ["ct58"],
            domeChampionships: 2,
        }
        const r = evaluateRun3Feats(full)
        expect(r.feats.find((f) => f.id === "r3_flamarokto")?.earned).toBe(true)
        expect(r.feats.find((f) => f.id === "r3_onirail")?.earned).toBe(true)
        expect(r.feats.find((f) => f.id === "r3_nemesis")?.earned).toBe(true)
        expect(r.feats.find((f) => f.id === "r3_centrale")?.earned).toBe(true)
        expect(r.feats.find((f) => f.id === "r3_maison_combat")?.earned).toBe(true)
        expect(r.feats.find((f) => f.id === "r3_dome")?.earned).toBe(true)
        expect(r.feats.find((f) => f.id === "r3_champion")?.earned).toBe(true)
    })

    it("némésis alternatif : Karatame suffit", () => {
        const r = evaluateRun3Feats({ ...empty, caughtThisRun: ["karatame"] })
        expect(r.feats.find((f) => f.id === "r3_nemesis")?.earned).toBe(true)
    })
})
