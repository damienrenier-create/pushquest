import { describe, it, expect } from "vitest"
import { createTable, startHand, type PokerTable } from "./engine"
import { ensureBots, runBots } from "./bots"
import { Rng } from "../battle/rng"

const sumStacks = (t: PokerTable) => t.seats.reduce((a, s) => a + s.stack, 0)
const mkPlayers = (n: number, stack = 1000) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, stack }))

describe("ensureBots — remplissage à ≥4", () => {
    it("comble jusqu'à 4 joueurs quand 1 humain est assis", () => {
        const t = createTable([{ id: "h", name: "Humain", stack: 1000 }], { sb: 5, bb: 10 })
        ensureBots(t, 4, 7)
        expect(t.seats.length).toBe(4)
        expect(t.seats.filter((s) => s.bot).length).toBe(3)
    })

    it("retire TOUS les bots quand plus aucun humain (table au repos)", () => {
        const t = createTable([{ id: "h", name: "Humain", stack: 1000 }], { sb: 5, bb: 10 })
        ensureBots(t, 4, 7)
        t.seats = t.seats.filter((s) => s.id !== "h") // l'humain quitte
        ensureBots(t, 4, 7)
        expect(t.seats.length).toBe(0)
    })

    it("n'ajoute AUCUN bot si déjà ≥4 humains", () => {
        const t = createTable(mkPlayers(4), { sb: 5, bb: 10 })
        ensureBots(t, 4, 7)
        expect(t.seats.filter((s) => s.bot).length).toBe(0)
    })
})

describe("runBots — jeu autonome", () => {
    it("une table 100% IA joue une main entière (jetons conservés, fin propre)", () => {
        const t = createTable(mkPlayers(4), { sb: 5, bb: 10 })
        t.seats.forEach((s) => (s.bot = true))
        const before = sumStacks(t)
        startHand(t, new Rng(11))
        runBots(t, new Rng(22))
        expect(t.phase).toBe("handComplete")
        expect(sumStacks(t)).toBe(before) // aucun jeton créé/détruit
    })

    it("s'ARRÊTE au tour d'un humain (table mixte)", () => {
        const t = createTable([{ id: "h", name: "H", stack: 1000 }, ...mkPlayers(3).map((p, i) => ({ ...p, id: `b${i}` }))], { sb: 5, bb: 10 })
        t.seats.filter((s) => s.id !== "h").forEach((s) => (s.bot = true))
        startHand(t, new Rng(33))
        runBots(t, new Rng(44))
        // soit c'est au tour de l'humain, soit la main est déjà finie (tous les bots couchés → l'humain rafle).
        expect(t.toAct < 0 || t.seats[t.toAct].id === "h").toBe(true)
    })
})
