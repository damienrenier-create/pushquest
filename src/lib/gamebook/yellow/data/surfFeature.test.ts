import { describe, it, expect } from "vitest"
import { MOVES } from "./moves"
import { CTS, getCt, run2BlackjackCtPool } from "./cts"
import { ctDefiOptions } from "./labDefis"
import { ctRewardOptions } from "../frontier/rewards"
import { tryMove } from "../engine/movement"
import type { PlayerState } from "../engine/types"
import type { YellowMapData } from "../maps"
import { YELLOW_MAPS } from "../maps"
import type { TileType } from "@/lib/gamebook/mapEngine"

const at = (x: number, y: number): PlayerState => ({ mapId: "test", posX: x, posY: y, direction: "down" })
// Petite carte : une case d'EAU au centre (2,1), tout le reste praticable. `id` paramétrable (bateau = exclu du surf).
function waterMap(id: string): YellowMapData {
    const tiles: TileType[][] = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => "path" as TileType))
    tiles[1][2] = "water"
    return { id, name: id, tiles, width: 3, height: 3 } as YellowMapData
}

describe("SURF — attaque (CT)", () => {
    it("surf = EAU, puissance 80, précision 100, 50% de baisser le Spécial (spc) de la cible", () => {
        const m = MOVES.surf
        expect(m).toBeTruthy()
        expect(m.type).toBe("EAU")
        expect(m.power).toBe(80)
        expect(m.accuracy).toBe(100)
        expect(m.effect?.chance).toBe(50)
        expect(m.effect?.statChanges).toEqual([{ target: "target", stat: "spc", stages: -1 }])
    })
    it("CT66 → surf, cadeau (price 0, gift), et EXCLUE du pool blackjack (exclusive au surfeur)", () => {
        const ct = getCt("ct66")
        expect(ct?.moveId).toBe("surf")
        expect(ct?.gift).toBe(true)
        expect(ct?.price).toBe(0)
        expect(run2BlackjackCtPool()).not.toContain("ct66")
        expect(CTS.filter((c) => c.id === "ct66")).toHaveLength(1) // id unique
    })
    it("SURF ne fuite d'AUCUN pool de CT : jamais au défi labo ni en récompense d'Usine (exclusif au SURFEUR)", () => {
        expect(ctDefiOptions().map((o) => o.ctId)).not.toContain("ct66")            // défi CT du labo
        // Récompense Usine : même face à un vaincu qui « connaîtrait » surf, ct66 reste exclue.
        expect(ctRewardOptions("pivinci", 80)).not.toContain("ct66")
    })
})

describe("SURF — traversée de l'eau (tryMove)", () => {
    const map = waterMap("test")
    it("SANS surf : l'eau reste bloquante (le joueur tourne mais n'avance pas)", () => {
        const r = tryMove(at(1, 1), "right", map) // vers (2,1) = eau
        expect([r.posX, r.posY]).toEqual([1, 1])
        expect(r.direction).toBe("right")
    })
    it("AVEC surf : l'eau devient franchissable", () => {
        const r = tryMove(at(1, 1), "right", map, { canSurf: true })
        expect([r.posX, r.posY]).toEqual([2, 1])
    })
    it("BATEAU (yellow_aqua_arena) : l'eau reste bloquante MÊME avec surf (on ne surfe pas dans le bateau)", () => {
        const boat = waterMap("yellow_aqua_arena")
        const r = tryMove(at(1, 1), "right", boat, { canSurf: true })
        expect([r.posX, r.posY]).toEqual([1, 1]) // bloqué malgré canSurf
    })
    it("la terre reste franchissable avec surf (surf n'empêche rien sur terre)", () => {
        expect([tryMove(at(1, 1), "up", map, { canSurf: true }).posX, tryMove(at(1, 1), "up", map, { canSurf: true }).posY]).toEqual([1, 0])
    })
})

describe("ÎLE ÉMERAUDE — carte + warps", () => {
    const ile = YELLOW_MAPS["yellow_ile_emeraude"]
    const plage = YELLOW_MAPS["yellow_plage"]
    const isBlock = (m: YellowMapData, x: number, y: number) => m.tiles[y][x] === "water" || m.tiles[y][x] === "tree"

    it("l'île existe, 19×32, avec fond image", () => {
        expect(ile).toBeTruthy()
        expect([ile.width, ile.height]).toEqual([19, 32])
        expect(ile.tiles.length).toBe(32)
        expect(ile.tiles.every((r) => r.length === 19)).toBe(true)
        expect(ile.backgroundImage).toBe("/yellow/sprites/ile_emeraude.png")
    })
    it("COL 0 (bord ouest) = eau = arrivée + retour ; centre = sable ; herbes hautes présentes", () => {
        expect(ile.tiles[16][0]).toBe("water") // col 0 = arrivée (spawn) + bord de retour, surfable
        expect(ile.tiles[16][5]).toBe("path")  // sable marchable (ouest du blob)
        expect(ile.tiles.some((row) => row.some((t) => t === "grassTall"))).toBe(true) // herbes hautes (fillers + rare)
    })
    it("warp ALLER LIGNE PAR LIGNE : plage col 23 (rows 0-31) = eau → île col 0 MÊME LIGNE", () => {
        for (const y of [0, 12, 18, 31]) {
            expect(plage.tiles[y][23]).toBe("water") // passage SURF (est de la mer col 22)
            const ex = plage.exits!.find((e) => e.x === 23 && e.y === y)
            expect(ex?.targetMapId).toBe("yellow_ile_emeraude")
            expect([ex?.targetSpawnX, ex?.targetSpawnY]).toEqual([0, y]) // → col 0, même ligne
        }
        expect(plage.exits!.filter((e) => e.x === 23 && e.targetMapId === "yellow_ile_emeraude")).toHaveLength(32)
    })
    it("warp RETOUR LIGNE PAR LIGNE : île col 0 → plage col 22 MÊME LIGNE (mer, on re-surfe)", () => {
        for (const y of [0, 12, 18, 31]) {
            const ex = ile.exits!.find((e) => e.x === 0 && e.y === y)
            expect(ex?.targetMapId).toBe("yellow_plage")
            expect([ex?.targetSpawnX, ex?.targetSpawnY]).toEqual([22, y])
            expect(plage.tiles[y][22]).toBe("water") // atterrit sur la mer (surf) → regagne la crique
        }
        expect(ile.exits!.filter((e) => e.x === 0 && e.targetMapId === "yellow_plage")).toHaveLength(32)
    })

    it("ACCESSIBILITÉ : EN SURF, on atteint le passage (23,15) depuis la terre de la plage (crique 18,29)", () => {
        // BFS : depuis (18,29) [terre], en marchant sur la terre ET en surfant sur l'eau (arbre = mur).
        const W = plage.width, H = plage.height
        const enterable = (x: number, y: number) => { const t = plage.tiles[y][x]; return t !== "tree" && t !== "fence" } // eau OK (surf), arbre non
        const seen = new Set<string>(["18,29"]); const q: [number, number][] = [[18, 29]]
        while (q.length) {
            const [x, y] = q.shift()!
            for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
                const nx = x + dx, ny = y + dy
                if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
                const k = `${nx},${ny}`
                if (seen.has(k) || !enterable(nx, ny)) continue
                seen.add(k); q.push([nx, ny])
            }
        }
        expect(seen.has("23,15")).toBe(true) // passage vers l'île atteignable en surfant
        expect(seen.has("22,10")).toBe(true) // la mer (col 22) est une voie libre le long de la carte
    })
})
