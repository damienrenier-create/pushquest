// PUR CALCUL — histogramme des types de tuiles des 4 cartes ciblées.
//   npx tsx scripts/_tree-histo.mts
import { YELLOW_MAPS } from "../src/lib/gamebook/yellow/maps"

const TARGETS = ["yellow_route_nord", "yellow_hautes_herbes", "yellow_entrance", "yellow_cendreville"]
const maps = YELLOW_MAPS as Record<string, { tiles: string[][]; width: number; height: number }>

for (const id of TARGETS) {
    const m = maps[id]
    if (!m) { console.log(`${id} : INTROUVABLE`); continue }
    const histo: Record<string, number> = {}
    for (const row of m.tiles) for (const t of row) histo[t] = (histo[t] ?? 0) + 1
    const sorted = Object.entries(histo).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}:${n}`).join("  ")
    console.log(`\n${id} (${m.width}×${m.height}) :\n  ${sorted}`)
}
