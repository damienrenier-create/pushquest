import { describe, it, expect } from "vitest"
import { buildFusionBossTeam, FUSION_BOSS_PAIRS, FUSION_BOSS_ULTRA, FUSION_LEAGUE } from "./fusionLeague"
import { getSpecies } from "./species"
import { getMove } from "./moves"

// BOSS FINAL — Dieu Spaghetti. Bronze = équipe d'origine (1er sacre accessible). ARGENT/OR = ULTRA-TEAM repensée à fond :
//   meilleure fusion par RÔLE (builds EV/Saiyan dédiés + IV parfaits), large couverture de types, 12 parents DISTINCTS.
//   UKOGNOFY réservée (goshendofy+ukognos jamais ensemble). MégamonarX/Galijah jamais parents (récompenses joueur).
const LEGENDARY_PARENTS = ["megamonarx", "galijah"]

describe("Boss final (Dieu Spaghetti) — équipe", () => {
    it("Bronze d'origine ; Argent/Or = ULTRA-TEAM (Pyrovolt…Gloutanté) ; ACE Gloutanté (SPECTRE/PLANTE)", () => {
        const bronze = buildFusionBossTeam("bronze").map((f) => getSpecies(f.speciesId)!.name)
        expect(bronze).toEqual(["Chronobyd", "Dracakoss", "Magnébrir", "Cryotony", "Ukoviathonn", "Aquendofy"])
        // Argent/Or : l'ultra-team (rôles dédiés). ACE = Gloutanté (Brookhanté × Gloutanoir) → SPECTRE/PLANTE.
        const team = buildFusionBossTeam("or")
        expect(team).toHaveLength(6)
        const names = team.map((f) => getSpecies(f.speciesId)!.name)
        expect(names).toEqual(["Pyrovolt", "Alicocci", "Kangonarque", "Mérotony", "Ukoviathonn", "Gloutanté"])
        const ace = getSpecies(team[5].speciesId)!
        expect(ace.types.sort()).toEqual(["PLANTE", "SPECTRE"])
        for (const f of team) {
            expect(f.instance.level).toBe(100) // palier Or
            expect(f.instance.moves).toHaveLength(4)
            for (const m of f.instance.moves) expect(getMove(m.moveId), m.moveId).toBeTruthy()
            // ULTRA-TEAM = IV parfaits partout (build « au max »).
            for (const k of ["hp", "atk", "def", "spe", "spc"] as const) expect(f.instance.ivs[k]).toBe(15)
        }
    })

    it("12 parents DISTINCTS (Bronze ET Ultra) ; goshendofy+ukognos jamais ensemble ; pas de légendaire parent ; NOMS ≠ Ligue", () => {
        const leagueNames = new Set(FUSION_LEAGUE.flatMap((t) => t.pairs).map((p) => p.name))
        for (const [label, pairs] of [["Bronze", FUSION_BOSS_PAIRS], ["Ultra", FUSION_BOSS_ULTRA]] as const) {
            const parents = pairs.flatMap((p) => [p.a, p.b])
            expect(new Set(parents).size, `${label} : 12 parents distincts`).toBe(parents.length)
            for (const p of pairs) {
                const pair = new Set([p.a, p.b])
                expect(pair.has("goshendofy") && pair.has("ukognos"), `${label} : Ukognofy interdit`).toBe(false)
                for (const leg of LEGENDARY_PARENTS) expect(pair.has(leg), `${label} : légendaire ${leg} interdit comme parent`).toBe(false)
                expect(leagueNames.has(p.name), `${label} : nom boss ${p.name} en collision avec la Ligue`).toBe(false)
            }
        }
    })
})
