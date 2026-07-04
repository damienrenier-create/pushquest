import { describe, it, expect } from "vitest"
import { createTable, startHand, act, totalPot, buildPots, settleShowdown, type PokerTable } from "./engine"
import { Rng } from "../battle/rng"
import type { Card, Suit } from "./cards"

const C = (rank: number, suit: Suit): Card => ({ rank, suit })
const stacks = (t: PokerTable) => t.seats.map((s) => s.stack)
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)

function table3(): PokerTable {
    return createTable([
        { id: "a", name: "Alice", stack: 1000 },
        { id: "b", name: "Bob", stack: 1000 },
        { id: "c", name: "Chloé", stack: 1000 },
    ], { sb: 5, bb: 10 })
}

describe("moteur poker — flux de base", () => {
    it("conserve TOUJOURS le total de jetons (blinds + calls + abattage)", () => {
        const t = table3()
        const before = sum(stacks(t))
        startHand(t, new Rng(12345))
        // Tout le monde suit / checke jusqu'à l'abattage (auto-play : call si mise à suivre, sinon check).
        let guard = 0
        while (t.phase !== "handComplete" && guard++ < 200) {
            const i = t.toAct
            if (i < 0) break
            const toCall = t.currentBet - t.seats[i].betThisRound
            act(t, i, { kind: toCall > 0 ? "call" : "check" })
        }
        expect(t.phase).toBe("handComplete")
        expect(sum(stacks(t))).toBe(before) // rien créé ni détruit
        expect(totalPot(t)).toBeGreaterThan(0)
    })

    it("fold-to-one : le dernier debout rafle les blinds, sans abattage", () => {
        const t = table3()
        startHand(t, new Rng(7))
        // UTG (bouton+3 = siège 0 en 3-max préflop après BB) se couche, puis un autre → il reste 1.
        // On couche les 2 premiers à parler ; le 3e rafle le pot.
        const first = t.toAct
        act(t, first, { kind: "fold" })
        const second = t.toAct
        act(t, second, { kind: "fold" })
        expect(t.phase).toBe("handComplete")
        expect(sum(stacks(t))).toBe(3000) // conservation du total
        expect(stacks(t).some((s) => s > 1000)).toBe(true) // le gagnant a raflé le pot (blindes)
    })
})

describe("side-pots (all-in de tailles différentes)", () => {
    it("buildPots : strate principale + side-pot corrects", () => {
        const t = createTable([
            { id: "a", name: "A", stack: 0 }, { id: "b", name: "B", stack: 0 }, { id: "c", name: "C", stack: 0 },
        ], { sb: 5, bb: 10 })
        t.seats.forEach((s) => (s.sittingOut = false)) // tapis 0 mais bien DANS la main (setup manuel)
        // A all-in 40, B et C engagés 100 chacun ; personne couché.
        t.seats[0].committed = 40; t.seats[1].committed = 100; t.seats[2].committed = 100
        const pots = buildPots(t)
        // Pot principal : 40×3 = 120 (A,B,C éligibles) ; side-pot : 60×2 = 120 (B,C éligibles).
        expect(pots.map((p) => p.amount)).toEqual([120, 120])
        expect(pots[0].eligible.sort()).toEqual([0, 1, 2])
        expect(pots[1].eligible.sort()).toEqual([1, 2])
    })

    it("abattage : le court-tapis gagne le pot principal, un autre le side-pot", () => {
        const t = createTable([
            { id: "a", name: "A", stack: 0 }, { id: "b", name: "B", stack: 0 }, { id: "c", name: "C", stack: 0 },
        ], { sb: 5, bb: 10 })
        t.seats.forEach((s) => (s.sittingOut = false))
        t.button = 2
        t.community = [C(14, 0), C(13, 0), C(7, 1), C(2, 2), C(3, 3)] // A♠ R♠ 7♥ 2♦ 3♣
        t.seats[0].committed = 40; t.seats[0].hole = [C(14, 1), C(14, 2)] // A short-stack : paire d'As (AA) → gagne
        t.seats[1].committed = 100; t.seats[1].hole = [C(13, 1), C(13, 2)] // B : paire de Rois
        t.seats[2].committed = 100; t.seats[2].hole = [C(12, 1), C(11, 2)] // C : rien (D V)
        t.phase = "river"
        settleShowdown(t)
        // Pot principal 120 → A (meilleure main). Side-pot 120 → B (Rois > D-haute de C).
        expect(t.seats[0].stack).toBe(120)
        expect(t.seats[1].stack).toBe(120)
        expect(t.seats[2].stack).toBe(0)
        expect(sum(stacks(t))).toBe(240) // = total engagé
    })

    it("split pot : égalité parfaite → partage", () => {
        const t = createTable([{ id: "a", name: "A", stack: 0 }, { id: "b", name: "B", stack: 0 }], { sb: 5, bb: 10 })
        t.seats.forEach((s) => (s.sittingOut = false))
        t.community = [C(14, 0), C(13, 0), C(12, 0), C(2, 2), C(3, 3)] // board fort A R D…
        t.seats[0].committed = 50; t.seats[0].hole = [C(5, 1), C(6, 1)] // ne jouent pas mieux que le board
        t.seats[1].committed = 50; t.seats[1].hole = [C(5, 2), C(6, 3)] // même chose → jouent le board → split
        t.phase = "river"
        settleShowdown(t)
        expect(t.seats[0].stack).toBe(50)
        expect(t.seats[1].stack).toBe(50)
    })
})
