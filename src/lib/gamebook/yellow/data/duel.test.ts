import { describe, it, expect } from "vitest"
import { hydratePlayer, duelWonToday, recordDuelWin, duelPlayedToday, recordDuelMatch, getPlayer } from "../store/playerStore"
import { parseSave } from "../storage/save"
import { duelWinLines, duelLossLines } from "./duel"

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
    it("dialogues : victoire mentionne la HYPER Nexus-Ball, défaite propose 30 énergie", () => {
        expect(duelWinLines("Bob", { refund: 120, ctDropped: true, energyToOpp: 200 }).join(" ")).toContain("HYPER Nexus-Ball")
        expect(duelLossLines("Bob").join(" ")).toContain("30")
    })
})
