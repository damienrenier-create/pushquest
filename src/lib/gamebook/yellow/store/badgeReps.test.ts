import { describe, it, expect, beforeEach } from "vitest"
import { hydratePlayer, getPlayer, dripBadgeReps, isBadgeRepsClaimed, champBattlesLeft, recordChampBattle, MAX_CHAMP_BATTLES_PER_DAY } from "./playerStore"
import { BADGE_REPS, BADGE_REPS_DAILY_CAP } from "../data/run1Badges"

beforeEach(() => {
    // État propre : rien payé, budget du jour plein, monde live (drip actif).
    hydratePlayer({ badgeRepsClaimed: [], badgeRepsToday: 0, reps: 0, repsCap: 100000 })
})

describe("dripBadgeReps — récompenses de hauts faits (une fois, drip 1000/jour)", () => {
    it("crédite les trophées gagnés non payés + les marque payés", () => {
        const granted = dripBadgeReps(["first_catch", "beat_arena"]) // 50 + 250
        expect(granted).toEqual([{ id: "first_catch", reps: 50 }, { id: "beat_arena", reps: 250 }])
        expect(isBadgeRepsClaimed("first_catch")).toBe(true)
        expect(isBadgeRepsClaimed("beat_arena")).toBe(true)
        expect(getPlayer().badgeRepsToday).toBe(300)
        expect(getPlayer().reps).toBe(300)
    })

    it("ne paie JAMAIS deux fois le même trophée", () => {
        dripBadgeReps(["first_catch"])
        const again = dripBadgeReps(["first_catch"])
        expect(again).toEqual([])
        expect(getPlayer().reps).toBe(50)
    })

    it("respecte le plafond quotidien (~1000/jour), le reste attend demain", () => {
        // budget déjà entamé à 950 → un dernier trophée peut faire dépasser (jamais fractionné), puis stop.
        hydratePlayer({ badgeRepsClaimed: [], badgeRepsToday: 950, reps: 0, repsCap: 100000 })
        const g1 = dripBadgeReps(["dex100", "champion"]) // dex100=1000 grante (budget 50>0), puis budget<0 → stop
        expect(g1).toEqual([{ id: "dex100", reps: 1000 }])
        expect(getPlayer().badgeRepsToday).toBe(1950)
        // budget épuisé → plus rien aujourd'hui (champion attend)
        expect(dripBadgeReps(["champion"])).toEqual([])
        expect(isBadgeRepsClaimed("champion")).toBe(false)
    })

    it("uncapped (RUN 2 fun) : verse TOUT en un seul drip, sans plafond, badgeRepsToday reste FINI", () => {
        // budget du jour quasi épuisé (950) MAIS uncapped → dex100 (1000) ET champion (250) versés d'un coup.
        hydratePlayer({ badgeRepsClaimed: [], badgeRepsToday: 950, reps: 0, repsCap: 100000 })
        const g = dripBadgeReps(["dex100", "champion"], {}, { uncapped: true })
        expect(g).toEqual([{ id: "dex100", reps: 1000 }, { id: "champion", reps: 250 }])
        expect(getPlayer().reps).toBe(1250)
        expect(getPlayer().badgeRepsToday).toBe(2200)                  // 950 + 1250
        expect(Number.isFinite(getPlayer().badgeRepsToday)).toBe(true) // jamais Infinity écrit en save
    })

    it("uncapped=false (défaut / run 1) : le plafond 1000/jour s'applique toujours", () => {
        hydratePlayer({ badgeRepsClaimed: [], badgeRepsToday: 950, reps: 0, repsCap: 100000 })
        const g = dripBadgeReps(["dex100", "champion"]) // capé : dex100 passe (budget 50>0), champion stoppé
        expect(g).toEqual([{ id: "dex100", reps: 1000 }])
    })

    it("ignore les ids sans reps + les trophées non gagnés (déjà filtrés en amont)", () => {
        const g = dripBadgeReps(["sylvebarbe", "inconnu"]) // sylvebarbe = endgame (0 reps), inconnu = pas dans BADGE_REPS
        expect(g).toEqual([])
    })

    it("6 nouveaux : reps via BADGE_REPS + berry_found via `extra` (phoenix 100 / autre 50)", () => {
        const g1 = dripBadgeReps(["fashion_outfit", "sage_saiyan"]) // 100 + 100 (BADGE_REPS)
        expect(g1).toEqual([{ id: "fashion_outfit", reps: 100 }, { id: "sage_saiyan", reps: 100 }])
        const g2 = dripBadgeReps(["berry_found:baie_pure", "berry_found:baie_phenix"], { "berry_found:baie_pure": 50, "berry_found:baie_phenix": 100 })
        expect(g2).toEqual([{ id: "berry_found:baie_pure", reps: 50 }, { id: "berry_found:baie_phenix", reps: 100 }])
        expect(isBadgeRepsClaimed("berry_found:baie_phenix")).toBe(true) // payé une fois
        expect(dripBadgeReps(["berry_found:baie_phenix"], { "berry_found:baie_phenix": 100 })).toEqual([]) // pas deux fois
    })

    it("cap combats champions (×1,5 XP) : 3/jour, reset au tick quotidien", () => {
        hydratePlayer({ champBattlesToday: 0 })
        expect(champBattlesLeft()).toBe(MAX_CHAMP_BATTLES_PER_DAY)
        expect(MAX_CHAMP_BATTLES_PER_DAY).toBe(3)
        recordChampBattle(); recordChampBattle(); recordChampBattle()
        expect(champBattlesLeft()).toBe(0) // plafond atteint → startHofBattle refusera les champ:
        recordChampBattle() // même au-delà, champBattlesLeft reste borné à 0
        expect(champBattlesLeft()).toBe(0)
    })

    it("barème conforme (échantillon)", () => {
        expect(BADGE_REPS.champion).toBe(250)
        expect(BADGE_REPS.league_6shiny).toBe(3000)
        expect(BADGE_REPS.dex_run1).toBe(1000)
        expect(BADGE_REPS.sylvebarbe).toBeUndefined() // endgame : pas de reps
        expect(BADGE_REPS_DAILY_CAP).toBe(1000)
    })
})
