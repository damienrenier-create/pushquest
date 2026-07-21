import { describe, it, expect } from "vitest"
import { buildFusionBossTeam, FUSION_BOSS_PAIRS, FUSION_LEAGUE } from "./fusionLeague"
import { getSpecies } from "./species"
import { getMove } from "./moves"

// BOSS FINAL — Dieu Spaghetti forme ultime : 3 chimères + UKOGNOFY (Goshendofy+Ukognos). Remplace le miroir.
describe("Boss final (Dieu Spaghetti) — équipe", () => {
    it("4 fusions dans l'ordre, Ukognofy en ace (DRAGON/FÉE), movesets curés valides", () => {
        const team = buildFusionBossTeam("or")
        expect(team).toHaveLength(4)
        const names = team.map((f) => getSpecies(f.speciesId)!.name)
        expect(names).toEqual(["Divinliane", "Pyromarée", "Zappadrak", "Ukognofy"])
        // Ukognofy = les 2 légendaires fusionnés → DRAGON/FÉE, stats énormes
        const ukog = getSpecies(team[3].speciesId)!
        expect(ukog.types.sort()).toEqual(["DRAGON", "FEE"])
        for (const f of team) {
            expect(f.instance.level).toBe(100) // palier Or
            expect(f.instance.moves).toHaveLength(4)
            for (const m of f.instance.moves) expect(getMove(m.moveId), m.moveId).toBeTruthy()
        }
    })

    it("parents tous DISTINCTS (aucun réutilisé dans le boss NI dans la Ligue)", () => {
        const bossParents = FUSION_BOSS_PAIRS.flatMap((p) => [p.a, p.b])
        expect(new Set(bossParents).size).toBe(bossParents.length) // pas de réutilisation interne
        const leagueParents = new Set(FUSION_LEAGUE.flatMap((t) => t.pairs).flatMap((p) => [p.a, p.b]))
        for (const p of bossParents) expect(leagueParents.has(p), `${p} déjà dans la Ligue`).toBe(false)
    })
})
