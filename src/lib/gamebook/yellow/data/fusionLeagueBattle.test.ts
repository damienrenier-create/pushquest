import { describe, it, expect } from "vitest"
import { isFusionBattleTrainer, startFusionLeagueBattle, getSnapshot, endBattle } from "../store/battleStore"
import { buildFusion, disposeFusion } from "./fusionMon"
import { buildFusionLeagueTeam, disposeFusionLeagueTeam } from "./fusionLeague"
import { createMonInstance } from "../battle/factory"

// LIGUE DE FUSION Inc.B — le joueur pilote son ROSTER de fusions (éphémère) contre l'équipe fusionnée d'un dresseur
// `y_fusion_*`. Garde CRITIQUE : la vraie équipe ne doit jamais être réécrite (isFusionBattleTrainer → isFactory).
describe("Ligue de Fusion — câblage combat (Inc.B)", () => {
    it("isFusionBattleTrainer : fusion:* (Autel) ET y_fusion_* (Ligue) = équipe éphémère protégée ; le reste = normal", () => {
        expect(isFusionBattleTrainer("fusion:TRIAL")).toBe(true)
        expect(isFusionBattleTrainer("y_fusion_1")).toBe(true)
        expect(isFusionBattleTrainer("y_fusion_maitre")).toBe(true)
        expect(isFusionBattleTrainer("y_ligue_1_olga")).toBe(false) // vraie Ligue → équipe PERSISTÉE (voulu)
        expect(isFusionBattleTrainer("frontier:FACTORY")).toBe(false) // géré séparément par isFactory
        expect(isFusionBattleTrainer("y_arena_druide")).toBe(false)
        expect(isFusionBattleTrainer(undefined)).toBe(false)
    })

    it("startFusionLeagueBattle : rejette équipe vide / mauvais préfixe ; sinon pose le dresseur + le combat", () => {
        const enemy = buildFusionLeagueTeam("lorelei", "bronze")
        const player = [buildFusion(createMonInstance("maitrezenc", 60), createMonInstance("divinpate", 60))]
        const eTeam = enemy.map((f) => f.instance)
        const pTeam = player.map((f) => f.instance)
        try {
            expect(startFusionLeagueBattle([], eTeam, 1, "y_fusion_1")).toBe(false)          // équipe joueur vide
            expect(startFusionLeagueBattle(pTeam, [], 1, "y_fusion_1")).toBe(false)          // ennemi vide
            expect(startFusionLeagueBattle(pTeam, eTeam, 1, "y_ligue_1_olga")).toBe(false)   // trainerId hors y_fusion_

            expect(startFusionLeagueBattle(pTeam, eTeam, 4242, "y_fusion_1")).toBe(true)     // OK
            const snap = getSnapshot()
            expect(snap.trainer?.trainerId).toBe("y_fusion_1") // → markTrainerDefeated (gating) à la victoire
            expect(snap.battle).not.toBeNull()
            expect(snap.battle!.player.team.length).toBe(1)
            expect(snap.battle!.enemy.team.length).toBe(4)     // les 4 fusions de Lorelei
            // l'ennemi fusionné porte bien ses stats figées (Spéciale unique) → l'IA hof les lira
            expect(snap.battle!.enemy.team[0].frozenStats?.spc).toBeGreaterThan(0)
        } finally {
            endBattle()
            player.forEach((f) => disposeFusion(f.speciesId))
            disposeFusionLeagueTeam(enemy)
        }
    })
})
