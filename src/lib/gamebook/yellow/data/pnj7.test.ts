import { describe, it, expect } from "vitest"
import { buildPnj7Team, primeGrotteDemo, takeGrotteDemoSpawn, resetGrotteDemo, pnj7DayMarker, PNJ7_LEVEL } from "./pnj7"
import { FUSION_BASE_IDS, FUSION_BASE_PARENTS, fusionForParents } from "./fusionBaseSpecies"

describe("PNJ 7 — L'Éclaireur de la Grotte", () => {
    it("buildPnj7Team : 5 némésis niv 70, moveset auto-dérivé, EV maxées", () => {
        const team = buildPnj7Team()
        expect(team.map((m) => m.speciesId)).toEqual(["leviabysse", "mouflorage", "condombre", "tenebrir", "uzumaro"])
        for (const m of team) {
            expect(m.level).toBe(PNJ7_LEVEL)
            expect(m.owned).toBe(false)
            expect(m.moves.length).toBeGreaterThan(0) // 4 dernières attaques du learnset à niv 70
        }
    })

    it("pnj7DayMarker : clé datée stable dans la journée", () => {
        expect(pnj7DayMarker()).toMatch(/^pnj7_\d{4}-\d{2}-\d{2}$/)
        expect(pnj7DayMarker()).toBe(pnj7DayMarker()) // même jour → même clé
    })

    it("démo de pop : 2 parents puis LEUR fusion (cohérence parents↔fusion)", () => {
        resetGrotteDemo()
        expect(takeGrotteDemoSpawn()).toBeNull() // rien avant amorçage
        primeGrotteDemo()
        const a = takeGrotteDemoSpawn()!
        const b = takeGrotteDemoSpawn()!
        const f = takeGrotteDemoSpawn()!
        expect(FUSION_BASE_IDS.includes(f)).toBe(true) // 3e = une fusion
        expect(fusionForParents(a, b)).toBe(f)         // les 2 premiers = SES parents
        expect(FUSION_BASE_PARENTS[f]).toContain(a)
        expect(FUSION_BASE_PARENTS[f]).toContain(b)
        expect(takeGrotteDemoSpawn()).toBeNull()       // file vidée après 3
    })

    it("resetGrotteDemo : purge la file en cours", () => {
        primeGrotteDemo()
        resetGrotteDemo()
        expect(takeGrotteDemoSpawn()).toBeNull()
    })
})
