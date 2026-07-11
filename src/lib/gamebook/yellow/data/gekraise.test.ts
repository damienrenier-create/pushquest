import { describe, it, expect } from "vitest"
import { buildGekroc } from "./gekroc"
import { getSpecies } from "./species"

describe("Gékroc / Gékraise / Gékosmic — le gardien de la Pierre selon le monde", () => {
    it("run 1 (live) : buildGekroc('live') = Gékroc (SOL/ÉLEC), N35", () => {
        const g = buildGekroc("live")
        expect(g.speciesId).toBe("gekroc")
        expect(getSpecies("gekroc")!.types).toEqual(["SOL", "ELEC"])
        expect(g.level).toBe(35)
    })

    it("run 2 (ngplus) : buildGekroc('ngplus') = Gékraise (ROCHE/FEU)", () => {
        const g = buildGekroc("ngplus")
        expect(g.speciesId).toBe("gekraise")
        expect(getSpecies("gekraise")!.types).toEqual(["ROCHE", "FEU"])
    })

    it("run 3 : buildGekroc('run3') = Gékosmic (ROCHE/PSY), mêmes stats/niveau/capture, learnsAllCts", () => {
        const g = buildGekroc("run3")
        expect(g.speciesId).toBe("gekosmic")
        const sp = getSpecies("gekosmic")!
        expect(sp.types).toEqual(["ROCHE", "PSY"])
        expect(sp.learnsAllCts).toBe(true)
        expect(sp.baseStats).toEqual(getSpecies("gekroc")!.baseStats) // mêmes stats que Gékroc/Gékraise
        expect(g.level).toBe(35)
        expect((g as { captureMult?: number }).captureMult).toBe(0.6) // capture dure, comme les 2 autres
    })

    it("les 3 jumeaux : BST 410 identique + masqués du Pokédex (hiddenUntilCaught)", () => {
        for (const id of ["gekroc", "gekraise", "gekosmic"]) {
            const sp = getSpecies(id)!
            expect(Object.values(sp.baseStats).reduce((a, b) => a + b, 0), id).toBe(410)
            expect(sp.hiddenUntilCaught, id).toBe(true)
        }
    })
})
