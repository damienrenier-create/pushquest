import { describe, it, expect } from "vitest"
import { RUN3_ARENA_MAPS, YELLOW_MAPS } from "./maps"
import { TRAINERS } from "./data/trainers"

// RUN 3 — variantes d'arène re-thémées (glace/combat/spectre) : grille 15×10 UNIFIÉE + fonds dédiés + dresseurs
// repositionnés. Ces variantes ne doivent JAMAIS altérer les cartes de base (run 1/2).

describe("RUN 3 — variantes d'arène re-thémées", () => {
    const IDS = ["yellow_arena", "yellow_arena_roche", "yellow_arena_feu"] as const

    it("les 3 variantes existent, toutes 15×10, fond _r3 + sortie (7,9)", () => {
        for (const id of IDS) {
            const m = RUN3_ARENA_MAPS[id]
            expect(m, id).toBeTruthy()
            expect(m.width).toBe(15)
            expect(m.height).toBe(10)
            expect(m.tiles.length).toBe(10)
            expect(m.tiles[0].length).toBe(15)
            expect(m.backgroundImage).toMatch(/_r3\.png$/)
            expect(m.exits?.[0]).toMatchObject({ x: 7, y: 9 })
        }
    })

    it("les 3 variantes partagent EXACTEMENT la même grille de collision (unifiée)", () => {
        const sig = (id: string) => RUN3_ARENA_MAPS[id].tiles.map((r) => r.join(",")).join("|")
        expect(sig("yellow_arena_roche")).toBe(sig("yellow_arena"))
        expect(sig("yellow_arena_feu")).toBe(sig("yellow_arena"))
    })

    it("NE modifie PAS les cartes de base (run 1/2) : feu reste 16×16, roche garde son fond", () => {
        expect(YELLOW_MAPS.yellow_arena_feu.width).toBe(16)
        expect(YELLOW_MAPS.yellow_arena_feu.height).toBe(16)
        expect(YELLOW_MAPS.yellow_arena_roche.backgroundImage).toBe("/yellow/sprites/arena_roche.png")
        expect(YELLOW_MAPS.yellow_arena.backgroundImage).toBe("/yellow/sprites/arena_plante.png")
    })

    it("les 4 gardes + boss de chaque arène ont les positions run-3 unifiées (2,5)(12,5)(4,7)(10,7)+boss(7,1)", () => {
        const wantG: [number, number][] = [[2, 5], [12, 5], [4, 7], [10, 7]]
        const groups = [
            { g: ["y_arena_g1", "y_arena_g2", "y_arena_g3", "y_arena_g4"], boss: "y_arena_druide" },
            { g: ["y_rocharena_g1", "y_rocharena_g2", "y_rocharena_g3", "y_rocharena_g4"], boss: "y_rocharena_boss" },
            { g: ["y_feuarena_g1", "y_feuarena_g2", "y_feuarena_g3", "y_feuarena_g4"], boss: "y_feuarena_boss" },
        ]
        const byId = (id: string) => TRAINERS.find((t) => t.id === id)!
        for (const grp of groups) {
            grp.g.forEach((id, i) => {
                const t = byId(id)
                expect([t.run3X, t.run3Y], id).toEqual(wantG[i])
            })
            const b = byId(grp.boss)
            // Boss run-3 = (7,1). Le druide y est DÉJÀ (pas de run3X) → défaut = (x,y) = (7,1).
            expect([b.run3X ?? b.x, b.run3Y ?? b.y], grp.boss).toEqual([7, 1])
        }
    })
})
