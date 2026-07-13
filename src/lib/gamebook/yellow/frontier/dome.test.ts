import { describe, it, expect } from "vitest"
import { Rng } from "../battle/rng"
import {
    createDome, advanceDome, playerOpponent, aiMatchAWins, aiLeadIndex, generateDomeTrainerTeam, DOME_SIZE, DOME_TEAM_SIZE,
} from "./dome"
import { DOME_TRAINERS } from "./domeTrainers"
import { getSpecies } from "../data/species"
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

describe("Dôme — équipes thématiques par persona", () => {
    it("respecte TOUJOURS excludeTypes (Géraldine jamais de Feu) + membre garanti (Naruto/grenouille)", () => {
        const ger = DOME_TRAINERS.find((t) => t.id === "geraldine")!
        for (let s = 0; s < 25; s++) {
            const team = generateDomeTrainerTeam(new Rng(s * 131 + 1), ger, 100, 6, 14)
            expect(team.length).toBe(6)
            for (const m of team) expect(getSpecies(m.speciesId)?.types ?? []).not.toContain("FEU")
        }
        const naruto = DOME_TRAINERS.find((t) => t.id === "naruto")!
        expect(generateDomeTrainerTeam(new Rng(42), naruto, 100, 6, 14).some((m) => m.speciesId === "uzumaro")).toBe(true)
    })

    it("un thème LARGE ne field que son type (Benus = Feu/Élec/Plante) + ace présent (pyropanthe)", () => {
        const benus = DOME_TRAINERS.find((t) => t.id === "benus")!
        const team = generateDomeTrainerTeam(new Rng(7), benus, 100, 6, 14)
        for (const m of team) {
            const types = getSpecies(m.speciesId)?.types ?? []
            expect(types.some((ty) => ["FEU", "ELEC", "PLANTE"].includes(ty)), `${m.speciesId} hors thème`).toBe(true)
        }
        expect(team.some((m) => m.speciesId === "pyropanthe")).toBe(true) // ace (variante Panthéon) bien inclus
    })

    it("déterministe (même graine → même équipe) et taille 6 pour les 30 dresseurs", () => {
        for (const t of DOME_TRAINERS) {
            const a = generateDomeTrainerTeam(new Rng(99), t, 100, 6, 14)
            const b = generateDomeTrainerTeam(new Rng(99), t, 100, 6, 14)
            expect(a.length, t.id).toBe(6)
            expect(a.map((m) => m.speciesId)).toEqual(b.map((m) => m.speciesId))
        }
    })
})
