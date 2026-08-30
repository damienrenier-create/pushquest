import { describe, it, expect } from "vitest"
import { BADGES, TIER_POINTS, RUN1_DEX_TOTAL, evaluateBadges, badgeScore, badgeInputFromSave, type BadgeInput } from "./run1Badges"
import { SPECIES } from "./species"

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

    it("Pokédex run 1 = 150 espèces (badge dex_run1) — +9 lignées de clan (dex run 1, capturables post-Sylvebarbe) ; exclut Sylvebarbe/Géckèbre (postLeague)", () => {
        expect(RUN1_DEX_TOTAL).toBe(150)
        expect(BADGES.find((b) => b.id === "dex_run1")!.label).toContain("150")
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

    it("Phase 2 — badgeInputFromSave DÉRIVE évolution (forme évoluée possédée) + casino (casinoTotalWon>0) + lit les 2 flags", () => {
        const evolvedId = Object.values(SPECIES).map((sp) => (sp as { evolution?: { toId?: string } }).evolution?.toId).find(Boolean)!
        const save = {
            team: [{ level: 40, speciesId: evolvedId }],
            labDefi: { casinoTotalWon: 500 }, leagueSixShiny: true, mirrorWinHigherLevel: true,
        } as unknown as Parameters<typeof badgeInputFromSave>[0]
        const i = badgeInputFromSave(save)
        expect(i.evolutions).toBe(1)            // possède une forme évoluée
        expect(i.casinoWins).toBe(1)            // casinoTotalWon > 0
        expect(i.leagueSixShiny).toBe(true)
        expect(i.mirrorWinHigherLevel).toBe(true)
        const r = evaluateBadges(i)
        for (const id of ["evolve", "casino_win", "league_6shiny", "beat_mirror_higher"]) {
            expect(r.badges.find((b) => b.id === id)!.earned, id).toBe(true)
        }
    })

    it("Phase 2 — pas de faux positif : base non-évoluée + casino à 0 ⇒ badges non gagnés", () => {
        const save = { team: [{ level: 5, speciesId: "gouttiny" }], labDefi: { casinoTotalWon: 0 } } as unknown as Parameters<typeof badgeInputFromSave>[0]
        const i = badgeInputFromSave(save)
        expect(i.evolutions).toBe(0)            // gouttiny = base (jamais une cible d'évolution)
        expect(i.casinoWins).toBe(0)
        expect(i.leagueSixShiny).toBe(false)    // absent → false
        expect(state(evaluateBadges(i), "evolve").earned).toBe(false)
        expect(state(evaluateBadges(i), "casino_win").earned).toBe(false)
    })

    it("ids de badges uniques", () => {
        const ids = BADGES.map((b) => b.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it("Zones run 1 — hauts faits d'exploration via defeatedTrainers + pnj5Wins", () => {
        const save = {
            defeatedTrainers: ["y_combat_merchant_intro", "y_frere_frisquet", "y_frere_grelot", "y_frere_glagla", "y_frere_givre", "y_frere_blizzard", "y_aqua_boss_a"],
            pnj5Wins: 2,
        } as unknown as Parameters<typeof badgeInputFromSave>[0]
        const i = badgeInputFromSave(save)
        expect(i.markers).toContain("y_aqua_boss_a")
        expect(i.pnj5Wins).toBe(2)
        const r = evaluateBadges(i)
        expect(state(r, "grotte_nexus").earned).toBe(true)   // passeur rencontré
        expect(state(r, "nexus_guardian").earned).toBe(true) // pnj5Wins >= 1
        expect(state(r, "ice_cave").earned).toBe(true)       // les 5 Frères Glaçon
        expect(state(r, "aqua_arena").earned).toBe(true)     // un boss aqua
        expect(state(r, "beach").earned).toBe(false)         // 0 dresseur de plage
        expect(state(r, "nexus_deep").earned).toBe(false)    // B2F non atteint
    })

    it("beat_trainer — les MARQUEURS d'événement ne comptent PAS comme des dresseurs battus (bug perdre-vs-ACE)", () => {
        // Compte neuf qui a juste croisé/parlé à l'ACE + déclenché des marqueurs (intro synergie, achat tenue…) mais
        //   n'a battu AUCUN vrai dresseur → beat_trainer ne doit PAS être gagné.
        const markersOnly = badgeInputFromSave({
            defeatedTrainers: ["y_ace_pass_1", "synergy_intro_seen", "ach_fashion", "autel_visited", "collectionneurDexGiven"],
        } as unknown as Parameters<typeof badgeInputFromSave>[0])
        expect(markersOnly.trainersBeaten).toBe(0)
        expect(state(evaluateBadges(markersOnly), "beat_trainer").earned).toBe(false)

        // Dès qu'un VRAI dresseur est présent (registre TRAINERS ou frère Glaçon), beat_trainer est gagné.
        const realTrainer = badgeInputFromSave({
            defeatedTrainers: ["ach_fashion", "y_frere_frisquet"],
        } as unknown as Parameters<typeof badgeInputFromSave>[0])
        expect(realTrainer.trainersBeaten).toBe(1)
        expect(state(evaluateBadges(realTrainer), "beat_trainer").earned).toBe(true)
    })

    it("Fusion run 1 — 1re fusion + Ligue via fusionHistory & marqueurs fusleague_*", () => {
        const save = {
            fusionHistory: [{ a: "nouillon", b: "gouttiny" }],
            defeatedTrainers: ["fusion_unlocked", "fusleague_bronze"],
        } as unknown as Parameters<typeof badgeInputFromSave>[0]
        const i = badgeInputFromSave(save)
        expect(i.fusionsCreated).toBe(1)
        const r = evaluateBadges(i)
        expect(state(r, "fusion_first").earned).toBe(true)     // fusionHistory.length >= 1
        expect(state(r, "fusion_league").earned).toBe(true)    // marqueur fusion_unlocked
        expect(state(r, "fusion_champion").earned).toBe(true)  // palier bronze = champion
        expect(state(r, "fusion_gold").earned).toBe(false)     // pas le palier OR
    })

    it("Zones/Fusion : secrets cachés (non révélés) tant que le contenu n'est pas rencontré", () => {
        const r = evaluateBadges(empty)
        for (const id of ["grotte_nexus", "nexus_guardian", "ice_cave", "beach", "aqua_arena", "fusion_first", "fusion_champion", "fusion_gold"]) {
            expect(state(r, id).revealed, id).toBe(false)
            expect(state(r, id).earned, id).toBe(false)
        }
    })

    it("badgeInputFromSave : mappe une save réelle → badges cohérents", () => {
        const save = {
            team: [{ level: 100, shiny: true, speciesId: "nouillon" }, { level: 40, speciesId: "gouttiny" }],
            pc: [{ level: 30, shiny: true, speciesId: "braisille" }],
            pokedex: { caught: ["nouillon", "gouttiny", "braisille"], seen: ["gekroc"] },
            badges: ["feu", "plante", "eau", "elec"], isChampion: true,
            defeatedTrainers: ["a", "b"], stats: { duelWinsTotal: 2 }, pvpStats: { wins: 1 },
            aceWins: 7, domeChampionships: 3, gekrocResolved: true, orcalineWins: 1, sylvebarbeAwake: true,
            caveTradeDone: true, hhCollectorWins: 1, sbireWinsTotal: 1, items: { master_ball: 1 },
            labDefi: { squat150Done: true }, berrySecretKnown: false,
        } as unknown as Parameters<typeof badgeInputFromSave>[0]
        const i = badgeInputFromSave(save)
        expect(i.mons.filter((m) => m.shiny).length).toBe(2)
        expect(i.arenaBadges).toBe(4)
        expect(i.hasMasterBall).toBe(true)
        const r = evaluateBadges(i)
        // gros paquet de badges gagnés (champion, arènes, gékroc, dôme or, ace7, master ball, sylvebarbe…)
        for (const id of ["champion", "gekroc", "dome_gold", "ace7", "masterball", "sylvebarbe", "shiny1", "first_catch"]) {
            expect(r.badges.find((b) => b.id === id)!.earned, id).toBe(true)
        }
        expect(r.totalPoints).toBeGreaterThan(200)
    })
})
