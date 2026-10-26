import { describe, it, expect } from "vitest"
import { runObtainableSpecies, captureGuide } from "./encounters"
import { SPECIAL_OBTAIN } from "./captureSpecial"
import { getSpecies } from "./species"

// DAEMOMANIAQUE — « ne montrer QUE les Daemons dispo dans le run où l'on est » (Sartay 26/10/2026).
describe("espèces obtenables par run (guide de capture)", () => {
    const r1 = runObtainableSpecies(1, false), r2 = runObtainableSpecies(2, false), r3 = runObtainableSpecies(3, false), r4 = runObtainableSpecies(4, true)

    it("la Grotte du Nexus n'existe qu'au run fusion : rien de ses exclusifs aux runs 1, 2 et 3", () => {
        for (const id of ["ukognofy", "geckebre", "sylvebarbe"]) {
            expect(r1.has(id), id).toBe(false); expect(r2.has(id), id).toBe(false); expect(r3.has(id), id).toBe(false)
            expect(r4.has(id), id).toBe(true)
        }
    })
    it("chaque run a ses propres obtentions", () => {
        for (const id of ["gouttiny", "feuillichot", "braisille", "pantheon", "gekroc", "tonytony", "goshendofy", "pivinci", "lapifrappe", "fujipanda", "loutrille"]) expect(r1.has(id), id).toBe(true)
        for (const id of ["merorem", "morrow", "gekraise", "ukognos", "obscurene", "joeyrrant"]) expect(r2.has(id), id).toBe(true) // Joeyrrant : sauvage au Manoir du run 2
        for (const id of ["onirail", "elefer", "cornaive", "coccipoing", "gekosmic", "marmoterre", "flamarokto", "magnetor"]) expect(r3.has(id), id).toBe(true)
        expect(r1.has("onirail")).toBe(false); expect(r2.has("gekosmic")).toBe(false); expect(r3.has("merorem")).toBe(false)
        expect(r1.has("joeyrrant")).toBe(false); expect(r1.has("obscurene")).toBe(false) // Ténèbres : pas avant Sylvebarbe
        for (const id of ["gouttiny", "feuillichot", "braisille"]) expect(r4.has(id), id).toBe(true) // le champion garde ses starters au guide
    })
    it("toutes les entrées spéciales sont annotées par run et désignent des espèces réelles", () => {
        for (const [id, s] of Object.entries(SPECIAL_OBTAIN)) {
            expect(getSpecies(id), id).toBeTruthy()
            expect(Array.isArray(s.runs), `${id} : runs manquant`).toBe(true)
        }
    })
    it("AUCUN TROU : chaque espèce listée pour une run a un vrai guide (où/quand OU comment)", () => {
        const holes: string[] = []
        for (const [run, set, endgame] of [[1, r1, false], [2, r2, false], [3, r3, false], [4, r4, true]] as const) {
            for (const id of set) {
                const sp = getSpecies(id); if (!sp || sp.dexNo >= 500) continue
                const g = captureGuide(id, run === 4 ? 1 : run, !endgame, run === 4, false, false)
                if (g.where.length === 0 && g.how.length === 0) holes.push(`run ${run} : ${sp.name} (${id})`)
            }
        }
        expect(holes, holes.join("\n")).toEqual([])
    })
})
