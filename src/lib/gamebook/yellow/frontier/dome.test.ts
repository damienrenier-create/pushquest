import { describe, it, expect } from "vitest"
import { Rng } from "../battle/rng"
import {
    createDome, advanceDome, playerOpponent, aiMatchAWins, aiLeadIndex, DOME_SIZE, DOME_TEAM_SIZE,
} from "./dome"
import type { OpponentSpec as Spec } from "./engine"

const PTEAM: Spec[] = [
    { speciesId: "pyrokoss", level: 50 },
    { speciesId: "razmaree", level: 50 },
    { speciesId: "sylvapuce", level: 50 },
]

describe("Dôme — création du bracket", () => {
    it("8 participants, joueur = id 0, IA avec équipes de 6 (6v6) au bon niveau + vraie identité de dresseur", () => {
        const d = createDome(new Rng(7), { level: 50, streak: 15, playerTeam: PTEAM })
        expect(d.entrants.length).toBe(DOME_SIZE)
        expect(d.entrants[0].isPlayer).toBe(true)
        expect(d.alive.length).toBe(DOME_SIZE)
        for (const e of d.entrants.slice(1)) { expect(e.team.length).toBe(DOME_TEAM_SIZE); expect(e.team.every(m => m.level === 50)).toBe(true) }
        // vrais noms : les IA portent une identité du pool des 30 (plus de « Spectre A »).
        for (const e of d.entrants.slice(1)) expect(e.trainerId, "IA sans identité de dresseur").toBeTruthy()
        expect(new Set(d.entrants.slice(1).map(e => e.trainerId)).size).toBe(DOME_SIZE - 1) // dresseurs DISTINCTS
        expect(d.status).toBe("active")
        expect(playerOpponent(d)).toBeTruthy()
    })
    it("déterministe : même graine → mêmes IA", () => {
        const a = createDome(new Rng(99), { level: 100, streak: 20, playerTeam: PTEAM })
        const b = createDome(new Rng(99), { level: 100, streak: 20, playerTeam: PTEAM })
        expect(a.entrants.map(e => e.team.map(m => m.speciesId).join("|"))).toEqual(b.entrants.map(e => e.team.map(m => m.speciesId).join("|")))
        expect(a.alive).toEqual(b.alive)
    })
})

describe("Dôme — progression", () => {
    it("3 victoires d'affilée → champion", () => {
        let d = createDome(new Rng(3), { level: 50, streak: 10, playerTeam: PTEAM })
        d = advanceDome(d, new Rng(1), true) // quart
        expect(d.status).toBe("active")
        d = advanceDome(d, new Rng(2), true) // demi
        expect(d.status).toBe("active")
        d = advanceDome(d, new Rng(3), true) // finale
        expect(d.status).toBe("won")
        expect(d.alive).toEqual([0])
    })
    it("une défaite → éliminé, puis advance est un no-op", () => {
        let d = createDome(new Rng(5), { level: 50, streak: 10, playerTeam: PTEAM })
        d = advanceDome(d, new Rng(1), false)
        expect(d.status).toBe("eliminated")
        expect(d.alive).not.toContain(0)
        const again = advanceDome(d, new Rng(9), true)
        expect(again.status).toBe("eliminated") // figé
    })
    it("le bracket réduit de moitié à chaque round (hors joueur)", () => {
        let d = createDome(new Rng(8), { level: 50, streak: 10, playerTeam: PTEAM })
        expect(d.alive.length).toBe(8)
        d = advanceDome(d, new Rng(1), true)
        expect(d.alive.length).toBe(4)
        d = advanceDome(d, new Rng(2), true)
        expect(d.alive.length).toBe(2)
    })
})

describe("Dôme — heuristiques IA", () => {
    it("aiMatchAWins : déterministe + renvoie un booléen", () => {
        const d = createDome(new Rng(4), { level: 50, streak: 15, playerTeam: PTEAM })
        const r1 = aiMatchAWins(new Rng(42), d.entrants[1], d.entrants[2])
        const r2 = aiMatchAWins(new Rng(42), d.entrants[1], d.entrants[2])
        expect(r1).toBe(r2)
        expect(typeof r1).toBe("boolean")
    })
    it("aiLeadIndex : renvoie un index valide du roster IA", () => {
        const d = createDome(new Rng(6), { level: 50, streak: 15, playerTeam: PTEAM })
        const idx = aiLeadIndex(d.entrants[1].team, PTEAM)
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(d.entrants[1].team.length)
    })
})
