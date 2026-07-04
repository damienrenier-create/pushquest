import { describe, it, expect } from "vitest"
import { createTable, act, type PokerTable } from "./engine"
import { publicView, joinTable, leaveTable, setSitOut, maybeStartHand, readyCount, timeoutAction } from "./room"
import { Rng } from "../battle/rng"
import type { Card, Suit } from "./cards"

const C = (rank: number, suit: Suit): Card => ({ rank, suit })
function table3(): PokerTable {
    return createTable([
        { id: "a", name: "Alice", stack: 1000 }, { id: "b", name: "Bob", stack: 1000 }, { id: "c", name: "Chloé", stack: 1000 },
    ], { sb: 5, bb: 10 })
}

describe("publicView — redaction (cartes cachées)", () => {
    it("chaque joueur ne voit QUE ses propres cartes ; jamais le paquet", () => {
        const t = table3()
        maybeStartHand(t, new Rng(1))
        const viewA = publicView(t, "a")
        expect(viewA.seats.find((s) => s.id === "a")!.hole).toHaveLength(2)   // Alice voit sa main
        expect(viewA.seats.find((s) => s.id === "b")!.hole).toBeUndefined()   // …pas celle de Bob
        expect(viewA.seats.find((s) => s.id === "c")!.hole).toBeUndefined()
        expect(viewA.seats.every((s) => s.holeCount === 2)).toBe(true)        // mais on sait qu'ils ont 2 cartes
        expect((viewA as unknown as { deck?: unknown }).deck).toBeUndefined() // le paquet n'est JAMAIS exposé
    })

    it("à l'ABATTAGE, les mains non couchées sont révélées ; les couchées restent cachées", () => {
        const t = table3()
        t.phase = "handComplete"; t.showdownOccurred = true
        t.seats[0].hole = [C(14, 0), C(14, 1)]; t.seats[0].folded = false
        t.seats[1].hole = [C(2, 0), C(7, 1)]; t.seats[1].folded = true // couché → caché
        const v = publicView(t) // pas de viewer
        expect(v.seats[0].hole).toHaveLength(2) // révélé (abattage, non couché)
        expect(v.seats[1].hole).toBeUndefined() // couché → jamais montré
    })
})

describe("cycle de vie de la table", () => {
    it("maybeStartHand : démarre à ≥2 joueurs, pas en dessous", () => {
        const solo = createTable([{ id: "a", name: "A", stack: 1000 }], { sb: 5, bb: 10 })
        expect(maybeStartHand(solo, new Rng(1))).toBe(false)
        const t = table3()
        expect(maybeStartHand(t, new Rng(1))).toBe(true)
        expect(t.phase).toBe("preflop")
    })

    it("un joueur qui rejoint EN pleine main entre à la main suivante (pas la courante)", () => {
        const t = createTable([{ id: "a", name: "A", stack: 1000 }, { id: "b", name: "B", stack: 1000 }], { sb: 5, bb: 10 })
        maybeStartHand(t, new Rng(2))
        joinTable(t, { id: "c", name: "C", buyin: 1000 })
        expect(t.seats.find((s) => s.id === "c")!.sittingOut).toBe(true) // hors main courante
        expect(readyCount(t)).toBe(3) // …mais prêt pour la suivante
    })

    it("sit-out volontaire : exclu de la prochaine main", () => {
        const t = table3()
        setSitOut(t, "c", true)
        expect(readyCount(t)).toBe(2)
        maybeStartHand(t, new Rng(3))
        expect(t.seats.find((s) => s.id === "c")!.sittingOut).toBe(true) // startHand a respecté le choix
    })

    it("leaveTable en pleine main : abandonne + rembourse ; le siège est retiré entre deux mains", () => {
        const t = table3()
        maybeStartHand(t, new Rng(4))
        const refund = leaveTable(t, "a")
        expect(refund).toBeGreaterThan(0)                 // tapis rendu
        expect(t.seats.find((s) => s.id === "a")!.folded).toBe(true) // main abandonnée
        // On finit la main (auto call/check) puis on relance → le siège "a" disparaît.
        let g = 0
        while (t.phase !== "handComplete" && g++ < 200) { const i = t.toAct; if (i < 0) break; const call = t.currentBet - t.seats[i].betThisRound; act(t, i, { kind: call > 0 ? "call" : "check" }) }
        maybeStartHand(t, new Rng(5))
        expect(t.seats.some((s) => s.id === "a")).toBe(false) // siège retiré
    })

    it("timeoutAction : checke si possible, sinon se couche", () => {
        const t = table3()
        maybeStartHand(t, new Rng(6))
        const before = t.toAct
        timeoutAction(t) // préflop, il y a la BB à suivre → devrait se coucher
        expect(t.seats[before].folded).toBe(true)
    })
})
