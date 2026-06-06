import { describe, it, expect } from "vitest"
import { TRAINERS, getTrainer, trainersOnMap } from "./trainers"
import { getSpecies } from "./species"
import { createMonInstance } from "../battle/factory"

describe("intégrité des données dresseurs", () => {
    it("ids uniques", () => {
        const ids = TRAINERS.map((t) => t.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it("chaque dresseur a une équipe non vide d'espèces valides et de niveaux 1..100", () => {
        for (const t of TRAINERS) {
            expect(t.team.length).toBeGreaterThan(0)
            for (const m of t.team) {
                expect(getSpecies(m.speciesId), `espèce inconnue: ${m.speciesId}`).not.toBeNull()
                expect(m.level).toBeGreaterThanOrEqual(1)
                expect(m.level).toBeLessThanOrEqual(100)
            }
        }
    })

    it("récompense non négative et dialogues intro/défaite non vides", () => {
        for (const t of TRAINERS) {
            // reward = argent legacy (non utilisé : le combat ne donne pas de reps).
            // Les chefs d'arène récompensent un BADGE, pas de l'argent → reward peut être 0.
            expect(t.reward).toBeGreaterThanOrEqual(0)
            expect(t.intro.length).toBeGreaterThan(0)
            expect(t.defeat.length).toBeGreaterThan(0)
        }
    })

    it("arène plante (Bosquet Sacré) : 5 dresseurs, seul le Druide donne le badge plante", () => {
        const arena = trainersOnMap("yellow_arena")
        expect(arena.length).toBe(5) // 4 gardes + 1 boss
        const badged = arena.filter((t) => t.badge)
        expect(badged.length).toBe(1)
        expect(badged[0].badge).toBe("plante")
        expect(badged[0].id).toBe("y_arena_druide")
    })

    it("chaque Daemon d'un dresseur se fabrique avec des PV pleins et des attaques", () => {
        for (const t of TRAINERS) {
            for (const m of t.team) {
                const inst = createMonInstance(m.speciesId, m.level)
                expect(inst.currentHp).toBeGreaterThan(0)
                expect(inst.moves.length).toBeGreaterThan(0)
                expect(inst.moves.length).toBeLessThanOrEqual(4)
            }
        }
    })

    it("getTrainer / trainersOnMap", () => {
        expect(getTrainer(TRAINERS[0].id)).toBe(TRAINERS[0])
        expect(getTrainer("inexistant")).toBeNull()
        expect(trainersOnMap("yellow_route_nord").length).toBeGreaterThan(0)
        expect(trainersOnMap("nulle_part")).toEqual([])
    })
})
