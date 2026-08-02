import { describe, it, expect } from "vitest"
import { captureGuide } from "./encounters"

describe("captureGuide (Daemomaniaque)", () => {
    it("espèce sauvage commune → au moins un lieu + des conseils", () => {
        const g = captureGuide("plumiot") // commun Route Nord + Hautes Herbes (VOL)
        expect(g.where.length).toBeGreaterThan(0)
        expect(g.how.length).toBeGreaterThan(0)
        expect(g.where.join(" ")).toContain("📍")
    })

    it("espèce inconnue → note d'aide, aucun lieu", () => {
        const g = captureGuide("___inconnu___")
        expect(g.where.length).toBe(0)
        expect(g.note).toBeTruthy()
    })

    it("structure toujours bien formée", () => {
        for (const id of ["nouillon", "cailloutchi", "gouttiny"]) {
            const g = captureGuide(id)
            expect(Array.isArray(g.where)).toBe(true)
            expect(Array.isArray(g.how)).toBe(true)
        }
    })
})
