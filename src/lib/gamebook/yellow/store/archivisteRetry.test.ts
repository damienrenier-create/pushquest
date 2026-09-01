import { describe, it, expect, beforeEach } from "vitest"
import { getPlayer, hydratePlayer, resetForIntro, creditDailyReps, archivisteMatchesToday, recordArchivisteMatch, archivisteWinsToday, recordArchivisteWin } from "./playerStore"
import { startTrainerBattle, getSnapshot } from "./battleStore"
import { ARCHIVISTE_TRAINER_ID, ARCHIVISTE_MAX_MATCHES_PER_DAY, archivisteEscalation } from "../data/collectionneurNpc"
import { DUEL_EXP_MULT } from "../data/duel"
import { createMonInstance } from "../battle/factory"

// L'ARCHIVISTE — retentable en cas de défaite : cap porté à 5 matchs/jour, mais l'escalade (niveaux + Saiyan) ne
// suit que les VICTOIRES du jour. Perdre = retenter à difficulté égale ; gagner = son prochain match durcit.
// Anti-farm : PAS d'XP doublée contre lui — son trainerId "collectionneur:" ne déclenche ni le multiplicateur des
// duels (duel:/run2ghost: → ×2) ni celui du Frontier ; il paie l'XP d'un dresseur normal.
describe("Archiviste — retry sur défaite (cap 5, escalade sur victoires)", () => {
    beforeEach(() => { resetForIntro() })

    it("perdre n'escalade PAS : 4 matchs disputés sans victoire → difficulté de base au 5e", () => {
        for (let i = 0; i < 4; i++) recordArchivisteMatch()   // 4 défaites (le match se compte au lancement)
        expect(archivisteMatchesToday()).toBe(4)
        expect(archivisteWinsToday()).toBe(0)
        expect(archivisteEscalation(archivisteWinsToday())).toEqual({ levelBonus: 0, saiyanPoints: 0 })
        expect(archivisteMatchesToday() < ARCHIVISTE_MAX_MATCHES_PER_DAY).toBe(true) // le 5e essai reste ouvert
    })

    it("gagner escalade : chaque victoire du jour durcit le match suivant", () => {
        recordArchivisteMatch(); recordArchivisteWin()
        expect(archivisteEscalation(archivisteWinsToday())).toEqual({ levelBonus: 3, saiyanPoints: 50 })
        recordArchivisteMatch(); recordArchivisteWin()
        expect(archivisteEscalation(archivisteWinsToday())).toEqual({ levelBonus: 6, saiyanPoints: 95 })
    })

    it("reset quotidien : matchs ET victoires repartent à zéro au tick", () => {
        hydratePlayer({ creditedThrough: "2026-09-01", archivisteMatchesToday: 5, archivisteWinsToday: 3 })
        creditDailyReps("2026-09-02")
        expect(archivisteMatchesToday()).toBe(0)
        expect(archivisteWinsToday()).toBe(0)
    })

    it("PAS d'XP doublée contre lui : expMult = 1 (là où un duel vaut ×2)", () => {
        const team = [createMonInstance("piouflot", 20)]
        const enemy = [createMonInstance("cailloutchi", 20, { owned: false })]
        startTrainerBattle(team, enemy, 42, { trainerId: ARCHIVISTE_TRAINER_ID, reward: 0, aiLevel: "hof" })
        expect(getSnapshot().battle?.expMult).toBe(1)

        startTrainerBattle(team, enemy, 42, { trainerId: "duel:autre-joueur", reward: 0 })
        expect(getSnapshot().battle?.expMult).toBe(DUEL_EXP_MULT) // témoin : le duel, lui, double bien
    })
})
