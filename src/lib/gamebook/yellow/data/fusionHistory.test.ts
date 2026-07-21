import { describe, it, expect, beforeEach } from "vitest"
import { parseSave, emptySave } from "../storage/save"
import { recordFusionCreated, getPlayer, resetForIntro, setDailyMarker, markTrainerDefeated } from "../store/playerStore"
import { historyFusions } from "./fusiodex"
import { getSpecies } from "./species"

// FUSIODEX — l'historique des fusions créées (paires {a,b} de speciesId) est PERSISTÉ. parseSave défensif (ancienne
// save sans le champ, valeurs hostiles), cap 200 (≠ roster plafonné à 6).
describe("fusionHistory — persistance", () => {
    it("emptySave = [] ; parseSave filtre les entrées invalides et borne à 200", () => {
        expect(emptySave().fusionHistory).toEqual([])
        const parsed = parseSave({
            fusionHistory: [
                { a: "mottoche", b: "lavapetit" }, // ok
                { a: 5, b: "x" },                  // a non-string → filtré
                { a: "y" },                        // b manquant → filtré
                null,                              // → filtré
            ],
        })
        expect(parsed.fusionHistory).toEqual([{ a: "mottoche", b: "lavapetit" }])
    })

    it("ancienne save (champ absent) → [] ; non-tableau → [] ; cap 200 (> roster)", () => {
        expect(parseSave({}).fusionHistory).toEqual([])
        expect(parseSave({ fusionHistory: "x" as unknown as [] }).fusionHistory).toEqual([])
        const big = Array.from({ length: 250 }, (_, i) => ({ a: `a${i}`, b: `b${i}` }))
        expect(parseSave({ fusionHistory: big }).fusionHistory.length).toBe(200)
    })
})

describe("fusionHistory — enregistrement + reconstruction", () => {
    beforeEach(() => resetForIntro())

    it("recordFusionCreated : append, dédup exacte, ORDRE préservé ((A,B) ≠ (B,A))", () => {
        recordFusionCreated("mottoche", "lavapetit")
        recordFusionCreated("mottoche", "lavapetit") // doublon exact → ignoré
        recordFusionCreated("lavapetit", "mottoche") // ordre inverse → fusion DISTINCTE
        expect(getPlayer().fusionHistory).toEqual([
            { a: "mottoche", b: "lavapetit" },
            { a: "lavapetit", b: "mottoche" },
        ])
    })

    it("recordFusionCreated : ignore une paire vide", () => {
        recordFusionCreated("", "lavapetit")
        recordFusionCreated("mottoche", "")
        expect(getPlayer().fusionHistory).toEqual([])
    })

    it("historyFusions : reconstruit nom + types + parents depuis la paire de speciesId", () => {
        recordFusionCreated("mottoche", "lavapetit")
        const list = historyFusions(getPlayer().fusionHistory)
        expect(list).toHaveLength(1)
        expect(list[0].name.length).toBeGreaterThan(0)
        expect(list[0].types.length).toBeGreaterThan(0)
        expect(list[0].parents).toEqual([getSpecies("mottoche")!.name, getSpecies("lavapetit")!.name])
        expect(list[0].bst).toBeGreaterThan(0)
    })

    it("setDailyMarker : garde AU PLUS UN marker du préfixe (borne le cap journalier PNJ 7)", () => {
        markTrainerDefeated("y_ligue_1") // un vrai marker (préfixe différent) ne doit pas être touché
        setDailyMarker("pnj7_", "pnj7_2026-07-19")
        setDailyMarker("pnj7_", "pnj7_2026-07-20")
        setDailyMarker("pnj7_", "pnj7_2026-07-21")
        const dt = getPlayer().defeatedTrainers
        expect(dt.filter((t) => t.startsWith("pnj7_"))).toEqual(["pnj7_2026-07-21"]) // 1 seul, le dernier
        expect(dt).toContain("y_ligue_1") // les autres markers intacts
    })

    it("historyFusions : CONSERVE une paire non résoluble en placeholder (bst 0), ne la masque pas", () => {
        recordFusionCreated("espece_inexistante_xyz", "lavapetit")
        const list = historyFusions(getPlayer().fusionHistory)
        expect(list).toHaveLength(1)
        expect(list[0].bst).toBe(0) // placeholder « chimère archivée »
        expect(list[0].name).toBe("Fusion oubliée")
    })
})
