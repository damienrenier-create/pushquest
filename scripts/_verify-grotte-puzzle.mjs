import { YELLOW_MAPS } from "../src/lib/gamebook/yellow/maps.ts"
import { BLOCKING_TILES } from "../src/lib/gamebook/mapEngine.ts"
const FLOORS = ["yellow_grotte_nexus","yellow_grotte_nexus_b1f","yellow_grotte_nexus_b2f"]
const blk = new Set(BLOCKING_TILES)
const walk = (mapId,x,y) => { const m=YELLOW_MAPS[mapId]; if(!m) return "MAP INEXISTANTE"; const t=m.tiles?.[y]?.[x]; return t===undefined?"HORS-GRILLE":(blk.has(t)?`BLOQUÉ(${t})`:"ok") }
let bad=0
for (const id of FLOORS){
  const m=YELLOW_MAPS[id]
  console.log(`\n=== ${id} (${m.exits?.length??0} échelles) ===`)
  for (const e of m.exits??[]){
    const onTile = walk(id, e.x, e.y)                         // l'échelle doit être marchable
    const spawn = walk(e.targetMapId, e.targetSpawnX, e.targetSpawnY) // le spawn d'arrivée doit être marchable
    const tgt = YELLOW_MAPS[e.targetMapId]
    const spawnIsExit = (tgt?.exits??[]).some(x=>x.x===e.targetSpawnX&&x.y===e.targetSpawnY) // spawn ≠ échelle (anti-boucle)
    const ok = onTile==="ok" && spawn==="ok" && !spawnIsExit
    if(!ok) bad++
    console.log(`  (${e.x},${e.y})→${e.targetMapId}(${e.targetSpawnX},${e.targetSpawnY})  échelle:${onTile}  spawn:${spawn}${spawnIsExit?"  ⚠️SPAWN-SUR-ÉCHELLE":""}  ${ok?"✅":"❌"}`)
  }
}
console.log(`\n${bad===0?"✅ TOUT COHÉRENT":`❌ ${bad} problème(s)`}`)
