// PUR CALCUL — sélectionne 30 spots fertiles BIEN RÉPARTIS (farthest-point sampling) par carte + exporte
// les grilles pour la débug map. Arbres (tree accessibles) sur les cartes boisées, herbe haute (grassTall)
// sur le champ d'entraînement.  npx tsx scripts/_berry-select.mts
import { YELLOW_MAPS } from "../src/lib/gamebook/yellow/maps"
import { writeFileSync } from "fs"

const OUT = "C:/Users/Sartay/AppData/Local/Temp/claude/C--Users-Sartay/14aec05a-7971-4c2c-8840-31905f0ba3a1/scratchpad/berry-maps.json"
const TARGETS = ["yellow_route_nord", "yellow_hautes_herbes", "yellow_entrance", "yellow_cendreville"]
const WALK = new Set(["grass", "grassTall", "path", "sand", "floor", "bridge", "cave", "snow", "ice"])
const isWalk = (t?: string) => t != null && WALK.has(t)
type P = { x: number; y: number }

function candidates(tiles: string[][], fertileType: string): P[] {
    const c: P[] = []
    for (let y = 0; y < tiles.length; y++) for (let x = 0; x < (tiles[y]?.length ?? 0); x++) {
        if (tiles[y][x] !== fertileType) continue
        if (fertileType === "grassTall") { c.push({ x, y }); continue } // herbe haute = marchable → candidat direct
        const acc = isWalk(tiles[y - 1]?.[x]) || isWalk(tiles[y + 1]?.[x]) || isWalk(tiles[y]?.[x - 1]) || isWalk(tiles[y]?.[x + 1])
        if (acc) c.push({ x, y })
    }
    return c
}

// Échantillonnage « point le plus éloigné » : démarre au barycentre des candidats, ajoute à chaque tour
// le candidat qui MAXIMISE sa distance min aux déjà-choisis → répartition régulière, pas de paquets.
function spread(cand: P[], n: number): P[] {
    if (cand.length <= n) return cand.slice()
    const cx = cand.reduce((a, p) => a + p.x, 0) / cand.length
    const cy = cand.reduce((a, p) => a + p.y, 0) / cand.length
    let si = 0, sb = Infinity
    for (let i = 0; i < cand.length; i++) { const d = (cand[i].x - cx) ** 2 + (cand[i].y - cy) ** 2; if (d < sb) { sb = d; si = i } }
    const picked = new Set<number>([si])
    const minD = cand.map((p) => (p.x - cand[si].x) ** 2 + (p.y - cand[si].y) ** 2)
    while (picked.size < n) {
        let bi = -1, bd = -1
        for (let i = 0; i < cand.length; i++) { if (picked.has(i)) continue; if (minD[i] > bd) { bd = minD[i]; bi = i } }
        if (bi < 0) break
        picked.add(bi)
        for (let i = 0; i < cand.length; i++) { const d = (cand[i].x - cand[bi].x) ** 2 + (cand[i].y - cand[bi].y) ** 2; if (d < minD[i]) minD[i] = d }
    }
    return [...picked].map((i) => cand[i]).sort((a, b) => a.y - b.y || a.x - b.x)
}

const maps = YELLOW_MAPS as Record<string, { tiles: string[][]; width: number; height: number; name: string }>
const out = TARGETS.map((id) => {
    const m = maps[id]
    const hasTrees = m.tiles.some((r) => r.includes("tree"))
    const fertileType = hasTrees ? "tree" : "grassTall"
    const cand = candidates(m.tiles, fertileType)
    const fertile = spread(cand, 30)
    console.log(`${id.padEnd(22)} ${fertileType.padEnd(9)} candidats=${String(cand.length).padStart(4)} → ${fertile.length} fertiles`)
    return { id, name: m.name, width: m.width, height: m.height, fertileType, tiles: m.tiles, fertile }
})
writeFileSync(OUT, JSON.stringify(out))
console.log("Exporté → " + OUT)
