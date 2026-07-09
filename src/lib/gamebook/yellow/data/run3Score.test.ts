import { describe, it, expect } from "vitest"
import { run3Score, bossEnemyKey, leagueEnemyKey, run3BossesMaxScore } from "./run3Score"
import { RUN3_BOSS_TEAMS } from "./run3Bosses"

describe("RUN 3 — score (Σ niveaux des ennemis vaincus, chacun une fois)", () => {
    it("somme les niveaux des ennemis distincts", () => {
        expect(run3Score([
            { key: bossEnemyKey("plante", 0), level: 17 },
            { key: bossEnemyKey("plante", 1), level: 21 },
            { key: leagueEnemyKey("y_ligue_glace", 0), level: 55 },
        ])).toBe(93)
    })

    it("chaque Pokémon compté UNE SEULE fois (dédup par clé, même en cas de re-combat)", () => {
        expect(run3Score([
            { key: bossEnemyKey("feu", 2), level: 35 },
            { key: bossEnemyKey("feu", 2), level: 35 }, // re-combat du même ennemi → ignoré
            { key: bossEnemyKey("feu", 3), level: 40 },
        ])).toBe(75)
    })

    it("liste vide → 0", () => {
        expect(run3Score([])).toBe(0)
    })

    it("clés stables et distinctes par source/index", () => {
        expect(bossEnemyKey("plante", 0)).toBe("boss:plante:0")
        expect(leagueEnemyKey("y_ligue_maitre", 5)).toBe("league:y_ligue_maitre:5")
        expect(bossEnemyKey("plante", 0)).not.toBe(bossEnemyKey("plante", 1))
    })

    it("score MAX des 5 boss figés = Σ de tous leurs niveaux (981 sur la curation actuelle)", () => {
        const manual = Object.values(RUN3_BOSS_TEAMS).reduce((a, b) => a + b.team.reduce((s, m) => s + m.level, 0), 0)
        expect(run3BossesMaxScore()).toBe(manual)
        expect(run3BossesMaxScore()).toBe(972) // Mools101 + Task1 145 + Neuneu187 + Embi254 + Franss285
    })
})
