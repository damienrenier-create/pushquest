import { describe, it, expect } from "vitest"
import { YELLOW_MAPS } from "../maps"
import { isBlockingTile } from "@/lib/gamebook/mapEngine"
import { FISHING_BY_MAP } from "./fishing"

// 27/10/2026 : l'eau de la GROTTE GELÉE n'était touchée par AUCUNE case marchable (berge marquée « mur » dans le masque)
//   → impossible d'y pêcher depuis le 19/08 (Têtardoc), puis Guizer (rare du run 3). Ce test garde TOUTES les eaux de pêche
//   atteignables : depuis les points d'arrivée de la carte, on doit pouvoir se tenir à côté d'une case d'eau.
const FISHING_MAPS = [...new Set([...Object.keys(FISHING_BY_MAP), "yellow_cendreville", "yellow_grotte_gelee", "yellow_plage"])]

function entryPoints(mapId: string): [number, number][] {
    const out: [number, number][] = []
    for (const m of Object.values(YELLOW_MAPS)) for (const e of m.exits ?? []) if (e.targetMapId === mapId) out.push([e.targetSpawnX, e.targetSpawnY])
    return out
}
function reachable(mapId: string): Set<string> {
    const map = YELLOW_MAPS[mapId]
    const seen = new Set<string>()
    const queue = entryPoints(mapId).filter(([x, y]) => !isBlockingTile(map.tiles[y]?.[x]))
    for (const [x, y] of queue) seen.add(`${x},${y}`)
    while (queue.length) {
        const [x, y] = queue.shift()!
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy, k = `${nx},${ny}`
            if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height || seen.has(k)) continue
            if (isBlockingTile(map.tiles[ny][nx])) continue
            seen.add(k); queue.push([nx, ny])
        }
    }
    return seen
}
const besideWater = (mapId: string, cells: Set<string>) => [...cells].filter((k) => {
    const [x, y] = k.split(",").map(Number)
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => YELLOW_MAPS[mapId].tiles[y + dy]?.[x + dx] === "water")
})

describe("pêche : chaque plan d'eau de pêche est atteignable à pied", () => {
    it.each(FISHING_MAPS)("%s : au moins une case marchable, atteinte depuis une entrée, touche l'eau", (mapId) => {
        expect(YELLOW_MAPS[mapId], mapId).toBeTruthy()
        expect(entryPoints(mapId).length, `${mapId} : aucune entrée`).toBeGreaterThan(0)
        expect(besideWater(mapId, reachable(mapId)).length, mapId).toBeGreaterThan(0)
    })
    it("Grotte Gelée : la berge rouverte borde la mare, sans ouvrir d'autre passage", () => {
        const map = YELLOW_MAPS.yellow_grotte_gelee
        const bank = [[19, 6], [19, 7], [18, 8], [18, 9]]
        for (const [x, y] of bank) expect(isBlockingTile(map.tiles[y][x]), `${x},${y}`).toBe(false)
        const r = reachable("yellow_grotte_gelee")
        for (const [x, y] of bank) expect(r.has(`${x},${y}`), `${x},${y} atteignable`).toBe(true)
        // chaque case de berge ne touche que : l'eau, un mur, une autre case de berge ou une case DÉJÀ marchable avant (18,6)(18,7)(17,8)(17,9)
        const before = new Set(["18,6", "18,7", "17,8", "17,9"])
        const bankSet = new Set(bank.map(([x, y]) => `${x},${y}`))
        for (const [x, y] of bank) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy, t = map.tiles[ny][nx], k = `${nx},${ny}`
            expect(t === "water" || isBlockingTile(t) || bankSet.has(k) || before.has(k), `${x},${y} → ${k} (${t})`).toBe(true)
        }
    })
})
