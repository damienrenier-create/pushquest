import { describe, it, expect } from "vitest"
import { YELLOW_MAPS } from "./maps"
import { isBlockingTile } from "@/lib/gamebook/mapEngine"

// Zone de Combat : garde-fous de traversabilité (spawn bas atteignable, passage, portes des 3 salles).
describe("Zone de Combat — map", () => {
    const z = YELLOW_MAPS["yellow_zone_combat"]
    const walkable = (x: number, y: number) => !isBlockingTile(z.tiles[y][x])

    it("spawn bas + passage central + sortie sud walkables", () => {
        expect(walkable(10, 12)).toBe(true) // spawn (arrivée sud)
        expect(walkable(9, 12)).toBe(true)  // passage
        expect(walkable(10, 13)).toBe(true) // ouverture sud (path)
        expect(walkable(9, 13)).toBe(true)
    })

    it("barrière ligne 12 (hors passage) + colonnes 1 & 18 bloquées", () => {
        expect(walkable(5, 12)).toBe(false)
        expect(walkable(15, 12)).toBe(false)
        for (let y = 2; y <= 11; y++) { expect(walkable(1, y), `col1 y${y}`).toBe(false); expect(walkable(18, y), `col18 y${y}`).toBe(false) }
    })

    it("portes des 3 salles en exits : tour (4,7) · usine (9,6)+(10,6) · dôme (15,6)", () => {
        const door = (x: number, y: number) => z.exits.some((e) => e.x === x && e.y === y && e.targetMapId?.startsWith("yellow_combat_"))
        expect(door(4, 7)).toBe(true)
        expect(door(9, 6)).toBe(true)
        expect(door(10, 6)).toBe(true)
        expect(door(15, 6)).toBe(true)
    })

    it("sortie sud vers Ville Jaune (cols 9-10, ligne 13)", () => {
        const south = z.exits.filter((e) => e.targetMapId === "yellow_entrance" && e.y === 13)
        expect(south.map((e) => e.x).sort((a, b) => a - b)).toEqual([9, 10])
    })
})
