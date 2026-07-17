import { describe, it, expect } from "vitest"
import { hydratePlayer, duelWonToday, recordDuelWin } from "../store/playerStore"
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
    it("dialogues : victoire mentionne la HYPER Nexus-Ball, défaite propose 30 énergie", () => {
        expect(duelWinLines("Bob", { refund: 120, ctDropped: true, energyToOpp: 200 }).join(" ")).toContain("HYPER Nexus-Ball")
        expect(duelLossLines("Bob").join(" ")).toContain("30")
    })
})
