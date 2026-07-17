// PUR CALCUL — énumère les cases "tree" de chaque carte + celles ACCESSIBLES (voisin marchable = collable au A).
//   npx tsx scripts/_tree-tiles.mts
import { YELLOW_MAPS } from "../src/lib/gamebook/yellow/maps"

const WALK = new Set(["grass", "grassTall", "path", "sand", "floor", "floorAlt", "bridge", "cave", "caveFloor", "snow", "ice", "carpet", "roof2"])
const isWalk = (t: string | undefined) => t != null && WALK.has(t)

for (const [id, map] of Object.entries(YELLOW_MAPS as Record<string, { tiles: string[][]; width: number; height: number }>)) {
    const tiles = map.tiles
    if (!Array.isArray(tiles)) continue
    const trees: Array<{ x: number; y: number; acc: boolean }> = []
    for (let y = 0; y < tiles.length; y++) {
        for (let x = 0; x < (tiles[y]?.length ?? 0); x++) {
            if (tiles[y][x] !== "tree") continue
            const acc = isWalk(tiles[y - 1]?.[x]) || isWalk(tiles[y + 1]?.[x]) || isWalk(tiles[y]?.[x - 1]) || isWalk(tiles[y]?.[x + 1])
            trees.push({ x, y, acc })
        }
    }
    const accessible = trees.filter((t) => t.acc)
    if (trees.length === 0) continue
    const sample = accessible.slice(0, 10).map((t) => `(${t.x},${t.y})`).join(" ")
    console.log(`${id.padEnd(26)} : ${String(trees.length).padStart(4)} arbres · ${String(accessible.length).padStart(3)} accessibles${accessible.length ? ` → ex. ${sample}` : ""}`)
}
