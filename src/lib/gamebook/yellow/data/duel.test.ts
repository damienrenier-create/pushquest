import { describe, it, expect } from "vitest"
import { hydratePlayer, duelWonToday, recordDuelWin, duelPlayedToday, recordDuelMatch, getPlayer } from "../store/playerStore"
import { parseSave } from "../storage/save"
import { duelWinLines, duelLossLines, duelRewardBall } from "./duel"

describe("Duels reflets — limite 1 victoire par joueur-IA et par jour", () => {
    it("recordDuelWin verrouille CE joueur-IA pour la journée (pas les autres)", () => {
        hydratePlayer({ creditedThrough: "2026-06-18", duelWins: {} })
        expect(duelWonToday("userA")).toBe(false)
        recordDuelWin("userA")
        expect(duelWonToday("userA")).toBe(true)
        expect(duelWonToday("userB")).toBe(false)
    })
    it("un nouveau jour rouvre les duels", () => {
        hydratePlayer({ creditedThrough: "2026-06-18", duelWins: { userA: "2026-06-17" } })
        expect(duelWonToday("userA")).toBe(false) // victoire d'hier → re-jouable
    })
    it("duelWins persiste dans la save (strings only)", () => {
        const s = parseSave({ version: 2, duelWins: { x: "2026-06-18", bad: 5 } })
        expect(s.duelWins).toEqual({ x: "2026-06-18" })
    })
    it("RUN 3 : recordDuelMatch verrouille le match miroir du jour (défaite comprise) SANS toucher duelWinsTotal", () => {
        hydratePlayer({ creditedThrough: "2026-06-18", duelWins: {} })
        const beforeTotal = getPlayer().stats.duelWinsTotal
        expect(duelPlayedToday()).toBe(false)
        recordDuelMatch()                                          // consommé au LANCEMENT (issue indifférente)
        expect(duelPlayedToday()).toBe(true)                       // 2e match du jour bloqué
        expect(getPlayer().stats.duelWinsTotal).toBe(beforeTotal)  // ≠ recordDuelWin → ne gonfle PAS le leaderboard Duelliste
        expect(duelWonToday("userA")).toBe(false)                  // n'affecte pas le gate per-adversaire (run 1/2)
    })
    it("dialogues : victoire annonce la ball réellement obtenue, défaite propose 30 énergie", () => {
        expect(duelWinLines("Bob", { refund: 120, ctDropped: true, energyToOpp: 200, ballLabel: "une HYPER Nexus-Ball" }).join(" ")).toContain("HYPER Nexus-Ball")
        expect(duelWinLines("Bob", { refund: 0, ctDropped: false, energyToOpp: 30, ballLabel: "une Nexus-Ball" }).join(" ")).toContain("une Nexus-Ball")
        expect(duelLossLines("Bob").join(" ")).toContain("30")
    })
    it("récompense graduée par badges : Nexus (0-1) → Super (2-4) → HYPER (5+)", () => {
        expect(duelRewardBall(0).id).toBe("poke_ball")
        expect(duelRewardBall(1).id).toBe("poke_ball")
        expect(duelRewardBall(2).id).toBe("super_ball")
        expect(duelRewardBall(4).id).toBe("super_ball")
        expect(duelRewardBall(5).id).toBe("hyper_ball")
    })
})
