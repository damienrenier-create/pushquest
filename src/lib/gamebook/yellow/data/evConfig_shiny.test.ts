import { describe, it, expect } from "vitest"
import { evTotalCap, EV_TOTAL_CAP } from "./evConfig"
import type { MonInstance } from "../battle/types"

// SHINY : +10 % de plafond d'EV SUPPLÉMENTAIRE, à GRINDER (le cap monte, les EV s'earnent toujours en combat).
// Rétroactif de fait : evTotalCap est recalculé en direct → tout shiny déjà capturé gagne ces 10 % de marge.
const mk = (over: Partial<MonInstance>): MonInstance => ({ speciesId: "razmaree", level: 50, ...over } as unknown as MonInstance)

describe("evTotalCap — bonus SHINY (+10 % de plafond à grinder)", () => {
    it("non-shiny : plafond de base (510)", () => {
        expect(evTotalCap(mk({}))).toBe(EV_TOTAL_CAP)
    })
    it("shiny : plafond +10 % (510 → 561)", () => {
        expect(evTotalCap(mk({ shiny: true }))).toBe(Math.floor(EV_TOTAL_CAP * 1.10))
    })
    it("shiny CUMULÉ avec le boost post-Ligue (IV parfaits + capture bas niveau)", () => {
        const perfect = { hp: 15, atk: 15, def: 15, spe: 15, spc: 15 }
        const boosted = mk({ shiny: true, evCapBoost: true, capturedLevel: 5, ivs: perfect })
        // (1 + 5% génétique + 5% capture) × 1.10 shiny = ×1.21
        expect(evTotalCap(boosted)).toBe(Math.floor(EV_TOTAL_CAP * 1.10 * 1.10))
    })
})
