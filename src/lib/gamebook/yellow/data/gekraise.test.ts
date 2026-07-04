import { describe, it, expect } from "vitest"
import { buildGekroc } from "./gekroc"
import { getSpecies } from "./species"

describe("Gékraise — jumeau ROCHE/FEU de Gékroc (run 2)", () => {
    it("run 1 : buildGekroc() = Gékroc (SOL/ÉLEC)", () => {
        const g = buildGekroc(false)
        expect(g.speciesId).toBe("gekroc")
        expect(getSpecies("gekroc")!.types).toEqual(["SOL", "ELEC"])
        expect(g.level).toBe(35)
    })

    it("run 2 (ngplus) : buildGekroc(true) = Gékraise (ROCHE/FEU), même niveau, learnsAllCts", () => {
        const g = buildGekroc(true)
        expect(g.speciesId).toBe("gekraise")
        const sp = getSpecies("gekraise")!
        expect(sp.types).toEqual(["ROCHE", "FEU"])
        expect(sp.learnsAllCts).toBe(true)
        expect(sp.baseStats).toEqual(getSpecies("gekroc")!.baseStats) // mêmes stats que Gékroc
        expect(g.level).toBe(35)
        expect((g as { captureMult?: number }).captureMult).toBe(0.6) // capture dure, comme Gékroc
    })
})
