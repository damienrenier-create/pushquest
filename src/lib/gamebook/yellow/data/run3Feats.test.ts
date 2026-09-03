import { describe, it, expect } from "vitest"
import { RUN3_FEATS, evaluateRun3Feats, type Run3FeatInput } from "./run3Feats"
import { NEMESIS_DONE_MARKER } from "./nemesisChallenge"

const empty: Run3FeatInput = { caughtThisRun: [], badges: [], isChampion: false, ownedCts: [], markers: [] }

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

    it("aucun jalon Zone de Combat / Dôme (absent du run 3)", () => {
        expect(RUN3_FEATS.some((f) => f.cat === "dome" || f.id === "r3_dome")).toBe(false)
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

    it("némésis : victoire = essai consommé SANS scellé de défaite", () => {
        // essai gagné (aucun _blocked)
        expect(evaluateRun3Feats({ ...empty, markers: [NEMESIS_DONE_MARKER] }).feats.find((f) => f.id === "r3_nemesis")?.earned).toBe(true)
        // essai perdu (espèce scellée) → pas atteint, quelle que soit l'espèce
        expect(evaluateRun3Feats({ ...empty, markers: [NEMESIS_DONE_MARKER, "caninombre_blocked"] }).feats.find((f) => f.id === "r3_nemesis")?.earned).toBe(false)
        // jamais tenté → pas atteint
        expect(evaluateRun3Feats(empty).feats.find((f) => f.id === "r3_nemesis")?.earned).toBe(false)
    })

    it("légendaires / donjon / sacre", () => {
        const dex30 = ["flamarokto", "onirail", "karmaki", ...Array.from({ length: 27 }, (_, k) => `sp${k}`)]
        const full: Run3FeatInput = {
            caughtThisRun: dex30,
            badges: ["plante", "roche", "feu", "elec", "eau"],
            isChampion: true,
            ownedCts: ["ct58"],
            markers: [NEMESIS_DONE_MARKER],
        }
        const r = evaluateRun3Feats(full)
        expect(r.feats.find((f) => f.id === "r3_flamarokto")?.earned).toBe(true)
        expect(r.feats.find((f) => f.id === "r3_onirail")?.earned).toBe(true)
        expect(r.feats.find((f) => f.id === "r3_centrale")?.earned).toBe(true)
        expect(r.feats.find((f) => f.id === "r3_maison_combat")?.earned).toBe(true)
        expect(r.feats.find((f) => f.id === "r3_champion")?.earned).toBe(true)
        expect(r.feats.find((f) => f.id === "r3_nemesis")?.earned).toBe(true)
        // tous les jalons atteints sur cette save
        expect(r.earnedCount).toBe(RUN3_FEATS.length)
    })
})
