import { describe, it, expect } from "vitest"
import { buildFusionBossTeam, FUSION_BOSS_PAIRS, FUSION_LEAGUE } from "./fusionLeague"
import { getSpecies } from "./species"
import { getMove } from "./moves"

// BOSS FINAL — Dieu Spaghetti forme ultime : équipe « max-0.6 » de 6 fusions, 12 parents DISTINCTS. UKOGNOFY est
//   réservée pour la VRAIE fin (goshendofy+ukognos jamais fusionnés ici). ACE = Aquendofy (DRAGON/EAU, BST 1750).
describe("Boss final (Dieu Spaghetti) — équipe", () => {
    it("6 fusions ; Bronze d'origine → Argent/Or : Chronobyd→Panthéclombre & Dracakoss→Kangonarque ; ace Aquendofy (DRAGON/EAU)", () => {
        // Bronze : composition d'origine (accessible pour le 1er sacre).
        const bronze = buildFusionBossTeam("bronze").map((f) => getSpecies(f.speciesId)!.name)
        expect(bronze).toEqual(["Chronobyd", "Dracakoss", "Magnébrir", "Cryotony", "Ukoviathonn", "Aquendofy"])
        // Argent/Or : Chronobyd (neutre) → némésis-vitesse Panthéclombre ; Dracakoss (neutre) → némésis-mur Kangonarque.
        const team = buildFusionBossTeam("or")
        expect(team).toHaveLength(6)
        const names = team.map((f) => getSpecies(f.speciesId)!.name)
        expect(names).toEqual(["Panthéclombre", "Kangonarque", "Magnébrir", "Cryotony", "Ukoviathonn", "Aquendofy"])
        // ACE = Aquendofy (goshendofy × aquapanthe) → DRAGON/EAU
        const ace = getSpecies(team[5].speciesId)!
        expect(ace.types.sort()).toEqual(["DRAGON", "EAU"])
        for (const f of team) {
            expect(f.instance.level).toBe(100) // palier Or
            expect(f.instance.moves).toHaveLength(4)
            for (const m of f.instance.moves) expect(getMove(m.moveId), m.moveId).toBeTruthy()
        }
    })

    it("12 parents DISTINCTS ; goshendofy+ukognos JAMAIS ensemble (Ukognofy réservée) ; NOMS ≠ Ligue", () => {
        const bossParents = FUSION_BOSS_PAIRS.flatMap((p) => [p.a, p.b])
        expect(new Set(bossParents).size).toBe(bossParents.length) // 12 parents distincts, aucun réutilisé
        // UKOGNOFY (goshendofy×ukognos) = la double-légendaire, gardée pour la vraie fin → jamais formée dans le boss.
        for (const p of FUSION_BOSS_PAIRS) {
            const pair = new Set([p.a, p.b])
            expect(pair.has("goshendofy") && pair.has("ukognos"), "goshendofy+ukognos (Ukognofy) interdit dans le boss").toBe(false)
        }
        const leagueNames = new Set(FUSION_LEAGUE.flatMap((t) => t.pairs).map((p) => p.name))
        for (const p of FUSION_BOSS_PAIRS) expect(leagueNames.has(p.name), `nom boss ${p.name} en collision avec la Ligue`).toBe(false)
    })
})
