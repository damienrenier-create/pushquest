import { describe, it, expect } from "vitest"
import { getSpecies, isDexHidden, visibleDexSpecies, SPECIES } from "./species"

// DEX tiéré par run : run 1 → Daemons run 1 ; run 2 → run 1+2 ; run 3 → TOUS. Le tiering masque les espèces d'un
// tier SUPÉRIEUR NON capturées (pas de spoiler) ; une fois capturées elles restent visibles (pokédex cumulatif).
const RUN3_SPECIES = ["magnetor", "elefer", "barrisfer", "colosfer", "cornaive", "astracorne", "lunarque", "coccipoing", "coccombat", "coccimperatrice"]

describe("RUN 3 — dex tiéré par run (runThreeOnly)", () => {
    it("Magnetor + les 9 starters run 3 sont marqués runThreeOnly", () => {
        for (const id of RUN3_SPECIES) expect(getSpecies(id)?.runThreeOnly, id).toBe(true)
    })

    it("run 1 & run 2 : une espèce run-3 NON capturée est MASQUÉE (pas de ??? avant l'heure)", () => {
        const elefer = getSpecies("elefer")!
        expect(isDexHidden(elefer, [], false, false, false)).toBe(true) // run 1
        expect(isDexHidden(elefer, [], false, true, false)).toBe(true)  // run 2 (isRun2)
    })

    it("run 3 : les espèces run-3 sont visibles (catalogue complet)", () => {
        expect(isDexHidden(getSpecies("elefer")!, [], false, false, true)).toBe(false)
        expect(visibleDexSpecies([], false, false, true).map((s) => s.id)).toContain("magnetor")
    })

    it("cumulatif : une espèce run-3 CAPTURÉE reste visible même en run 1 (pokédex global)", () => {
        expect(isDexHidden(getSpecies("elefer")!, ["elefer"], false, false, false)).toBe(false)
    })

    it("run 3 : les espèces run-2 (runTwoOnly) sont AUSSI visibles (run 1+2+3)", () => {
        const merorem = getSpecies("merorem")!
        expect(isDexHidden(merorem, [], false, false, true)).toBe(false)  // visible en run 3
        expect(isDexHidden(merorem, [], false, false, false)).toBe(true)  // masquée en run 1
    })

    it("run 1 : catalogue SANS aucune espèce run-3 (pas de spoiler)", () => {
        const ids = visibleDexSpecies([], false, false, false).map((s) => s.id)
        for (const id of RUN3_SPECIES) expect(ids, id).not.toContain(id)
    })
})

describe("POST-RUN 3 (fusion faite → run3Used) — catalogue débloqué à 100%", () => {
    it("dexFullUnlock masque plus RIEN, même en live (isRun2/isRun3 false)", () => {
        const elefer = getSpecies("elefer")!         // runThreeOnly
        const merorem = getSpecies("merorem")!        // runTwoOnly
        expect(isDexHidden(elefer, [], false, false, false, true)).toBe(false)
        expect(isDexHidden(merorem, [], false, false, false, true)).toBe(false)
    })
    it("visibleDexSpecies(dexFullUnlock) = catalogue COMPLET (toutes les espèces, aucun tier masqué)", () => {
        const full = visibleDexSpecies([], false, false, false, true)
        const asRun3 = visibleDexSpecies([], false, false, true, false) // « comme en run 3 » (tout visible)
        // le catalogue post-fusion contient TOUTES les espèces run-3 + run-2, en live
        for (const id of [...RUN3_SPECIES, "merorem"]) expect(full.map((s) => s.id)).toContain(id)
        expect(full.length).toBe(asRun3.length)               // full-unlock ⇔ visibilité run 3
        expect(full.length).toBe(Object.keys(SPECIES).length) // = catalogue COMPLET, rien masqué
    })
    it("sans dexFullUnlock (défaut false) : comportement tiéré INCHANGÉ", () => {
        expect(isDexHidden(getSpecies("elefer")!, [], false, false, false)).toBe(true) // toujours masqué en run 1
    })
})
