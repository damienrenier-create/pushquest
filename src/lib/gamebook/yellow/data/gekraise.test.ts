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

    it("run 3 : buildGekroc('run3') = Gékosmic (ROCHE/PSY), BST 410, learnsAllCts (stats PERSONNALISÉES ≠ Gékroc)", () => {
        const g = buildGekroc("run3")
        expect(g.speciesId).toBe("gekosmic")
        const sp = getSpecies("gekosmic")!
        expect(sp.types).toEqual(["ROCHE", "PSY"])
        expect(sp.learnsAllCts).toBe(true)
        expect(Object.values(sp.baseStats).reduce((a, b) => a + b, 0)).toBe(410) // BST conservé, spread propre (spé++)
        expect(sp.baseStats).not.toEqual(getSpecies("gekroc")!.baseStats)         // personnalité distincte (plus « mêmes stats »)
        expect(g.level).toBe(35)
        expect((g as { captureMult?: number }).captureMult).toBe(0.6) // capture dure, comme les 2 autres
    })

    it("les 5 Gek : BST 410 chacun (personnalités distinctes) + masqués du Pokédex (hiddenUntilCaught)", () => {
        for (const id of ["gekroc", "gekraise", "gekosmic", "geckebre", "geaucke"]) {
            const sp = getSpecies(id)!
            expect(Object.values(sp.baseStats).reduce((a, b) => a + b, 0), id).toBe(410)
            expect(sp.hiddenUntilCaught, id).toBe(true)
        }
    })
})
