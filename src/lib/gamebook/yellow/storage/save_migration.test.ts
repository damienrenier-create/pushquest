import { describe, it, expect } from "vitest"
import { parseSave, SAVE_VERSION } from "./save"

// NERF ACE — migration v2 : remet le cliquet ACE (acePeakLevel + aceTeamSizePeak) à zéro pour
// les saves antérieures à v2, en CONSERVANT aceWins (progrès vers le Panthéon à la 7e victoire).
describe("migration v2 — reset du cliquet ACE", () => {
    it("save v1 → cliquet remis à zéro, aceWins CONSERVÉ, version bumpée", () => {
        const v1 = { version: 1, acePeakLevel: 55, aceTeamSizePeak: 6, aceWins: 5 }
        const s = parseSave(v1)
        expect(s.acePeakLevel).toBe(0) // recalibrera sur l'équipe actuelle au prochain combat
        expect(s.aceTeamSizePeak).toBe(3)
        expect(s.aceWins).toBe(5) // PRÉSERVÉ
        expect(s.version).toBe(SAVE_VERSION)
    })

    it("save sans version (legacy) → traitée comme < v2 → reset", () => {
        const legacy = { acePeakLevel: 40, aceWins: 2 }
        const s = parseSave(legacy)
        expect(s.acePeakLevel).toBe(0)
        expect(s.aceWins).toBe(2)
    })

    it("save DÉJÀ en v2 → cliquet PRÉSERVÉ (pas de double reset)", () => {
        const v2 = { version: 2, acePeakLevel: 42, aceTeamSizePeak: 5, aceWins: 3 }
        const s = parseSave(v2)
        expect(s.acePeakLevel).toBe(42)
        expect(s.aceTeamSizePeak).toBe(5)
        expect(s.aceWins).toBe(3)
    })
})
