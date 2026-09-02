import { describe, it, expect } from "vitest"
import { pateDeLuxeGodLines, pateDeLuxeRestoreLines } from "./pateDeLuxeGod"

describe("pateDeLuxeGodLines — commentaire du Dieu Spaghetti", () => {
    it("mentionne le nom du Daemon + colle à l'issue", () => {
        expect(pateDeLuxeGodLines("shiny_perfect", "Toto", 0).join(" ")).toContain("Toto")
        expect(pateDeLuxeGodLines("shiny_perfect", "Toto", 0).join(" ")).toMatch(/SHINY|scintille/i)
        expect(pateDeLuxeGodLines("perfect", "Toto", 0).join(" ")).toMatch(/PERFECTION|parfait|SUBLIME|affûté/i)
        expect(pateDeLuxeGodLines("min", "Toto", 0).join(" ")).toMatch(/rang D|plancher|carbonisé|raplapla/i)
    })
    it("déterministe par `rand` ; variantes distinctes", () => {
        expect(pateDeLuxeGodLines("min", "X", 0)).toEqual(pateDeLuxeGodLines("min", "X", 0))
        expect(pateDeLuxeGodLines("perfect", "X", 0)[0]).not.toBe(pateDeLuxeGodLines("perfect", "X", 0.99)[0])
    })
    it("rand borné (0 et ~1) → toujours une ligne non vide", () => {
        for (const o of ["perfect", "min", "shiny_perfect"] as const) {
            expect(pateDeLuxeGodLines(o, "X", 0)[0].length).toBeGreaterThan(0)
            expect(pateDeLuxeGodLines(o, "X", 1)[0].length).toBeGreaterThan(0)
        }
    })
    it("restauration : mentionne le Daemon + l'idée de retour à l'origine", () => {
        expect(pateDeLuxeRestoreLines("Toto", 0).join(" ")).toContain("Toto")
        expect(pateDeLuxeRestoreLines("Toto", 0).join(" ")).toMatch(/origine|sources|d'origine|efface/i)
        expect(pateDeLuxeRestoreLines("X", 0)[0]).not.toBe(pateDeLuxeRestoreLines("X", 0.99)[0])
    })
})
