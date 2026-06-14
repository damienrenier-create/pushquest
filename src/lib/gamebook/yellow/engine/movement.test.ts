import { describe, it, expect } from "vitest"
import { tryMove } from "./movement"
import type { PlayerState } from "./types"
import type { YellowMapData } from "../maps"
import type { TileType } from "@/lib/gamebook/mapEngine"

// Carte N×N 100% praticable ("path"), avec d'éventuels murs d'arête.
function mapNxN(n: number, edgeWalls?: YellowMapData["edgeWalls"]): YellowMapData {
    const tiles: TileType[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => "path" as TileType))
    return { id: "test", name: "TEST", tiles, width: n, height: n, edgeWalls } as YellowMapData
}
const at = (x: number, y: number): PlayerState => ({ mapId: "test", posX: x, posY: y, direction: "down" })

// Grille 3×3 de booléens à false, avec quelques arêtes posées.
function edges(v: Array<[number, number]>, h: Array<[number, number]>) {
    const mk = () => Array.from({ length: 3 }, () => [false, false, false])
    const V = mk(), H = mk()
    for (const [x, y] of v) V[y][x] = true
    for (const [x, y] of h) H[y][x] = true
    return { v: V, h: H }
}

describe("tryMove — labyrinthe invisible (murs d'arête)", () => {
    // Mur vertical entre (1,1) et (2,1) ; mur horizontal entre (1,1) et (1,2).
    const map = mapNxN(3, edges([[1, 1]], [[1, 1]]))

    it("bloque le passage à travers une arête verticale (droite)", () => {
        const r = tryMove(at(1, 1), "right", map)
        expect([r.posX, r.posY]).toEqual([1, 1]) // n'avance pas
        expect(r.direction).toBe("right")        // tourne quand même
    })
    it("bloque l'arête verticale dans l'autre sens (gauche) — symétrie", () => {
        const r = tryMove(at(2, 1), "left", map)
        expect([r.posX, r.posY]).toEqual([2, 1])
    })
    it("bloque le passage à travers une arête horizontale (bas)", () => {
        const r = tryMove(at(1, 1), "down", map)
        expect([r.posX, r.posY]).toEqual([1, 1])
    })
    it("bloque l'arête horizontale dans l'autre sens (haut) — symétrie", () => {
        const r = tryMove(at(1, 2), "up", map)
        expect([r.posX, r.posY]).toEqual([1, 2])
    })
    it("laisse passer les directions SANS arête", () => {
        expect([tryMove(at(1, 1), "up", map).posX, tryMove(at(1, 1), "up", map).posY]).toEqual([1, 0])
        expect([tryMove(at(1, 1), "left", map).posX, tryMove(at(1, 1), "left", map).posY]).toEqual([0, 1])
    })
    it("sans edgeWalls, tous les déplacements praticables passent", () => {
        const plain = mapNxN(3)
        expect([tryMove(at(1, 1), "right", plain).posX, tryMove(at(1, 1), "right", plain).posY]).toEqual([2, 1])
        expect([tryMove(at(1, 1), "down", plain).posX, tryMove(at(1, 1), "down", plain).posY]).toEqual([1, 2])
    })
})
