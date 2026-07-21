import { describe, it, expect } from "vitest"
import { buildFusionTrialEnemy } from "./fusionTrial"
import { getSpecies } from "./species"
import { getMove } from "./moves"

// ÉPREUVE D'OUVERTURE de la Ligue de Fusion : combat vs Tonyront (Tonytony+Calderont) & Maîtrelmin (Maitrezenc+Hebulmin).
describe("Épreuve de fusion (ouverture Ligue)", () => {
    it("2 fusions ennemies, scalées au niveau, noms + types + movesets curés valides", () => {
        const { team, speciesIds } = buildFusionTrialEnemy(60)
        expect(team).toHaveLength(2)
        expect(speciesIds).toHaveLength(2)
        const [tony, maitre] = team.map((m) => getSpecies(m.speciesId)!)
        expect(tony.name).toBe("Tonyront")
        expect(maitre.name).toBe("Maîtrelmin")
        // niveau appliqué (scale) + moveset curé (4 attaques réelles)
        for (const m of team) {
            expect(m.level).toBe(60)
            expect(m.moves).toHaveLength(4)
            for (const mv of m.moves) expect(getMove(mv.moveId), mv.moveId).toBeTruthy()
        }
        // Maîtrelmin = COMBAT/ELEC physique → a bien Coup de Boutoir (COMBAT STAB)
        expect(maitre.types).toContain("COMBAT")
        expect(team[1].moves.some((m) => m.moveId === "coup_de_boutoir")).toBe(true)
    })

    it("chaque appel produit des ids d'espèce ÉPHÉMÈRES uniques (à disposer, pas de collision entre épreuves)", () => {
        const a = buildFusionTrialEnemy(50).speciesIds
        const b = buildFusionTrialEnemy(50).speciesIds
        expect(a[0]).not.toBe(b[0]) // uids frais → ids distincts
    })
})
