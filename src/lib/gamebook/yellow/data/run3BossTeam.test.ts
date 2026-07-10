import { describe, it, expect } from "vitest"
import { run3ArenaBossTeam } from "./run3Bosses"

describe("RUN 3 — boss d'arène TRONQUÉ (taille croissante, proche du boss original)", () => {
    it("arène 1 (plante) : 3 Daemons proches du niveau du Druide (~16), les + forts écartés", () => {
        const team = run3ArenaBossTeam("plante")
        expect(team.length).toBe(3)
        for (const m of team) expect(Math.abs(m.level - 16), `${m.speciesId} L${m.level}`).toBeLessThanOrEqual(4)
        expect(team.some((m) => m.speciesId === "crocodaillus")).toBe(false) // L23, trop fort → exclu
        expect(team.some((m) => m.speciesId === "bouh")).toBe(false)         // L21, trop fort → exclu
        for (let i = 1; i < team.length; i++) expect(team[i].level).toBeGreaterThanOrEqual(team[i - 1].level) // du + faible au + fort
    })

    it("arène 5 (eau) : équipe COMPLÈTE (6 Daemons)", () => {
        expect(run3ArenaBossTeam("eau").length).toBe(6)
    })

    it("les tailles montent : plante ≤ roche ≤ feu ≤ elec ≤ eau", () => {
        const sizes = ["plante", "roche", "feu", "elec", "eau"].map((b) => run3ArenaBossTeam(b).length)
        for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeGreaterThanOrEqual(sizes[i - 1])
    })
})
