import { YELLOW_MAPS } from "../src/lib/gamebook/yellow/maps"
import { YELLOW_NPCS } from "../src/lib/gamebook/yellow/npcs"
import { isBlockingTile } from "../src/lib/gamebook/mapEngine"
const m = YELLOW_MAPS["yellow_zone_combat"]
console.log("yellow_zone_combat", m.width+"x"+m.height, "| exits:", JSON.stringify((m.exits??[]).map(e=>`(${e.x},${e.y})→${e.targetMapId}`)))
const npcs = YELLOW_NPCS.filter(n=>n.mapId==="yellow_zone_combat")
console.log("PNJ ici:", npcs.map(n=>`${n.id}@(${n.initialX},${n.initialY})`).join(", "))
const npcAt = (x,y)=>npcs.find(n=>n.initialX===x&&n.initialY===y)
console.log("   "+Array.from({length:m.width},(_,i)=>String(i%10)).join(""))
for(let y=0;y<m.height;y++){
  let s=""
  for(let x=0;x<m.width;x++){
    const n=npcAt(x,y)
    if(n) s+= n.id==="y_grotte_passeur"?"P": n.id==="y_combat_merchant"?"M":"N"
    else s+= isBlockingTile(m.tiles[y][x])?"#":"."
  }
  console.log(String(y).padStart(2)+" "+s)
}
console.log("\nP=passeur M=marchand N=autre PNJ  #=bloquant .=sol")
