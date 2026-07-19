import { describe, it, expect } from "vitest"
import { BADGES, TIER_POINTS, RUN1_DEX_TOTAL, evaluateBadges, badgeScore, type BadgeInput } from "./run1Badges"

const empty: BadgeInput = {
    caught: [], seen: [], mons: [], teamSize: 0, arenaBadges: 0, isChampion: false,
    trainersBeaten: 0, mirrorWins: 0, pvpWins: 0, aceWins: 0, domeChampionships: 0,
    gekrocResolved: false, orcalineWins: 0, sylvebarbeAwake: false, pnjTradeDone: false,
    hhCollectorWins: 0, sbireWins: 0, hasMasterBall: false, labDefiDone: false, berrySecretKnown: false,
}
const state = (r: ReturnType<typeof evaluateBadges>, id: string) => r.badges.find((b) => b.id === id)!

describe("Badges run 1 — socle", () => {
    it("barème : 5 tiers 5/15/30/75/150", () => {
        expect([TIER_POINTS.bronze, TIER_POINTS.silver, TIER_POINTS.gold, TIER_POINTS.diamond, TIER_POINTS.legend]).toEqual([5, 15, 30, 75, 150])
    })

    it("Pokédex run 1 = 141 espèces (badge dex_run1)", () => {
        expect(RUN1_DEX_TOTAL).toBe(141)
        expect(BADGES.find((b) => b.id === "dex_run1")!.label).toContain("141")
    })

    it("save vierge : 0 point, aucun badge gagné", () => {
        const r = evaluateBadges(empty)
        expect(r.totalPoints).toBe(0)
        expect(r.earnedCount).toBe(0)
    })

    it("OBJECTIFS toujours révélés (grisés), même non gagnés", () => {
        const r = evaluateBadges(empty)
        for (const id of ["first_catch", "beat_arena", "champion", "dex10", "shiny1"]) {
            expect(state(r, id).revealed, id).toBe(true)   // objectif → grisé visible
            expect(state(r, id).earned, id).toBe(false)
        }
    })

    it("SECRETS cachés tant que non rencontrés, révélés à la rencontre (seen)", () => {
        const r0 = evaluateBadges(empty)
        expect(state(r0, "gekroc").revealed).toBe(false)      // pas vu → caché
        expect(state(r0, "goshendofy").revealed).toBe(false)
        // vu Gékroc (pas encore chopé) → révélé mais pas gagné
        const r1 = evaluateBadges({ ...empty, seen: ["gekroc"] })
        expect(state(r1, "gekroc").revealed).toBe(true)
        expect(state(r1, "gekroc").earned).toBe(false)
        // chopé → gagné
        const r2 = evaluateBadges({ ...empty, gekrocResolved: true })
        expect(state(r2, "gekroc").earned).toBe(true)
        expect(state(r2, "gekroc").revealed).toBe(true)
    })

    it("le Dôme est secret (se greffe plus tard)", () => {
        expect(BADGES.find((b) => b.id === "dome_bronze")!.secret).toBe(true)
        expect(state(evaluateBadges(empty), "dome_bronze").revealed).toBe(false)
        expect(state(evaluateBadges({ ...empty, domeChampionships: 1 }), "dome_bronze").earned).toBe(true)
    })

    it("scoring : cumule les points des badges gagnés", () => {
        const i: BadgeInput = { ...empty, caught: ["nouillon", "gouttiny", "braisille"], trainersBeaten: 3, arenaBadges: 1, teamSize: 6 }
        const r = evaluateBadges(i)
        // first_catch(5) + beat_trainer(5) + full_team(5) + beat_arena(15) + types3(15) = 45  (+ dex10 non car <10)
        expect(state(r, "first_catch").earned).toBe(true)
        expect(state(r, "beat_arena").earned).toBe(true)
        expect(badgeScore(i)).toBe(r.totalPoints)
        expect(r.totalPoints).toBeGreaterThan(0)
    })

    it("shiny compte les instances shiny (équipe+PC)", () => {
        const mons = Array.from({ length: 6 }, () => ({ level: 50, shiny: true }))
        expect(state(evaluateBadges({ ...empty, mons }), "shiny6").earned).toBe(true)
        expect(state(evaluateBadges({ ...empty, mons: [{ level: 50, shiny: true }] }), "shiny6").earned).toBe(false)
    })

    it("compteurs à instrumenter : non-gagnés par défaut (optionnels)", () => {
        const r = evaluateBadges(empty)
        for (const id of ["evolve", "trade_player", "shiny_trade", "beat_mirror_higher", "bet_win", "casino_win", "league_6shiny"]) {
            expect(state(r, id).earned, id).toBe(false)
        }
        expect(state(evaluateBadges({ ...empty, evolutions: 1 }), "evolve").earned).toBe(true)
    })

    it("ids de badges uniques", () => {
        const ids = BADGES.map((b) => b.id)
        expect(new Set(ids).size).toBe(ids.length)
    })
})
