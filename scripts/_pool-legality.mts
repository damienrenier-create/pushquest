import { readFileSync } from "node:fs"
import { getSpecies } from "../src/lib/gamebook/yellow/data/species"
import { CTS, canLearnCt } from "../src/lib/gamebook/yellow/data/cts"
import { getMove } from "../src/lib/gamebook/yellow/data/moves"

const pool = JSON.parse(readFileSync("scripts/_pool-resolved.json", "utf8"))

// Learnable via CT ? (une CT enseignant ce move ET compatible avec l'espèce)
function ctLegal(species:any, moveId:string):boolean {
  return CTS.some((c:any) => c.moveId === moveId && canLearnCt(species, c))
}

const illegals:string[] = []
let checked = 0
for (const t of pool) {
  for (const m of t.mons) {
    const sp:any = getSpecies(m.speciesId)
    if (!sp) continue
    const learnset = new Set((sp.learnset ?? []).map((e:any)=>e.moveId))
    for (const mid of m.moveIds) {
      checked++
      const legal = learnset.has(mid) || ctLegal(sp, mid)
      if (!legal) {
        const mv = getMove(mid)
        illegals.push(`${t.archetype} · ${m.speciesId} · ${mid} (${mv?.type ?? "?"}) — pas au learnset, aucune CT compatible`)
      }
    }
  }
}
console.log(`Moves vérifiés: ${checked}`)
console.log(`ILLÉGAUX: ${illegals.length}`)
illegals.forEach(x=>console.log("  ✗ "+x))
