import { describe, it, expect } from "vitest"
import { arenaRevancheBoost, arenaRevancheIntro } from "./ngplusArenas"

// REVANCHE RUN 2 : chaque arène propose une revanche = son arène RUN 1 d'origine (+N niveaux),
// N croissant par arène (1→+2 … 5→+6). Boss ET gardes héritent du boost de leur arène.
describe("revanche run 2 — boost de niveau par arène", () => {
    it("chaque BOSS d'arène a le bon boost (+2 → +6)", () => {
        expect(arenaRevancheBoost("y_arena_druide")).toBe(2)    // arène 1 — plante
        expect(arenaRevancheBoost("y_rocharena_boss")).toBe(3)  // arène 2 — roche
        expect(arenaRevancheBoost("y_feuarena_boss")).toBe(4)   // arène 3 — feu
        expect(arenaRevancheBoost("y_elecarena_boss")).toBe(5)  // arène 4 — élec
        expect(arenaRevancheBoost("y_eauarena_boss")).toBe(6)   // arène 5 — eau
    })

    it("les GARDES héritent du boost de leur arène", () => {
        expect(arenaRevancheBoost("y_arena_g1")).toBe(2)
        expect(arenaRevancheBoost("y_arena_g4")).toBe(2)
        expect(arenaRevancheBoost("y_rocharena_g2")).toBe(3)
        expect(arenaRevancheBoost("y_feuarena_g3")).toBe(4)
        expect(arenaRevancheBoost("y_elecarena_g1")).toBe(5)
        expect(arenaRevancheBoost("y_eauarena_g4")).toBe(6)
    })

    it("un dresseur HORS arène (Ligue, route, inconnu) → null (pas de revanche)", () => {
        expect(arenaRevancheBoost("y_ligue_maitre")).toBeNull()
        expect(arenaRevancheBoost("y_ligue_1_olga")).toBeNull()
        expect(arenaRevancheBoost("y_trainer_leo")).toBeNull()
        expect(arenaRevancheBoost("trainer_inexistant")).toBeNull()
    })

    it("arenaRevancheIntro : lignes différentes boss vs garde", () => {
        const boss = arenaRevancheIntro("PYRA", true)
        const garde = arenaRevancheIntro("GARDE", false)
        expect(boss.length).toBeGreaterThan(0)
        expect(garde.length).toBeGreaterThan(0)
        expect(boss.join(" ")).toContain("PYRA")
    })
})
