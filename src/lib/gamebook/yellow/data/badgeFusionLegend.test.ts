import { describe, it, expect } from "vitest"
import { badgeInputFromSave, evaluateBadges } from "./run1Badges"

// Badges endgame RÉTROACTIFS (aucun nouveau champ save) : légendaires ultimes + fusions.
const earned = (save: any, id: string) =>
    evaluateBadges(badgeInputFromSave(save)).badges.find((b) => b.id === id)?.earned

describe("badges légendaires ultimes + fusions (rétroactifs)", () => {
    it("catch_megamonarx / catch_galijah : via capture (pokedex.caught)", () => {
        expect(earned({ pokedex: { caught: ["megamonarx"], seen: [] } }, "catch_megamonarx")).toBe(true)
        expect(earned({ pokedex: { caught: ["galijah"], seen: [] } }, "catch_galijah")).toBe(true)
        expect(earned({ pokedex: { caught: [], seen: [] } }, "catch_megamonarx")).toBe(false)
    })

    it("catch_ukognofy : via le marqueur ukognofy_caught", () => {
        expect(earned({ defeatedTrainers: ["ukognofy_caught"], pokedex: { caught: [], seen: [] } }, "catch_ukognofy")).toBe(true)
        expect(earned({ pokedex: { caught: [], seen: [] } }, "catch_ukognofy")).toBe(false)
    })

    it("catch_fusion : gagné si une espèce dexNo>=500 est capturée (ukognofy=505), pas un légendaire <500", () => {
        expect(earned({ pokedex: { caught: ["ukognofy"], seen: [] } }, "catch_fusion")).toBe(true)
        expect(earned({ pokedex: { caught: ["megamonarx"], seen: [] } }, "catch_fusion")).toBe(false) // dexNo 203
    })

    it("fusionsDiscovered : compte les espèces-fusion APERÇUES (ignore les ids inconnus / <500)", () => {
        const inp = badgeInputFromSave({ pokedex: { caught: [], seen: ["ukognofy", "megamonarx", "id_inexistant"] } })
        expect(inp.fusionsDiscovered).toBe(1) // seul ukognofy (505) compte ; megamonarx=203, id inconnu=0
    })

    it("trade_player : gagné quand stats.playerTrades >= 1 (câblage forward-only)", () => {
        expect(earned({ stats: { playerTrades: 1 } as any, pokedex: { caught: [], seen: [] } }, "trade_player")).toBe(true)
        expect(earned({ pokedex: { caught: [], seen: [] } }, "trade_player")).toBe(false)
    })
})
