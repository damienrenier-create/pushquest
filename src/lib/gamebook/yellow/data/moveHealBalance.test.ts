import { describe, it, expect } from "vitest"
import { MOVES } from "./moves"

// ÉQUILIBRAGE DES SOINS 50% — un soin de la moitié des PV ne doit JAMAIS être gratuit :
//   Repos = sommeil 1 tour ; Linceul & Reprise d'Ailes = coût max (10 reps) + -1 Vitesse au lanceur.
// Verrou anti-régression (Linceul/Reprise dominaient Repos avant : même soin, 0 contrepartie, moins cher).
describe("équilibrage des soins 50%", () => {
    const hasSelfSpeedDrop = (id: string) =>
        (MOVES[id].effect?.statChanges ?? []).some((s) => s.target === "self" && s.stat === "spe" && s.stages < 0)

    it("Repos garde son sommeil (contrepartie classique)", () => {
        expect(MOVES.repos.effect?.healPct).toBe(50)
        expect(MOVES.repos.effect?.restSleep).toBe(true)
    })

    for (const id of ["linceul", "reprise_ailes"]) {
        it(`${id} : soin 50% + coût max (costPower 100) + -1 Vitesse au lanceur`, () => {
            expect(MOVES[id].effect?.healPct).toBe(50)
            expect(MOVES[id].costPower).toBe(100)
            expect(hasSelfSpeedDrop(id)).toBe(true)
        })
    }
})
