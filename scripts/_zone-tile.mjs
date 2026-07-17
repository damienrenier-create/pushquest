import { YELLOW_MAPS } from "../src/lib/gamebook/yellow/maps"
import { isBlockingTile } from "../src/lib/gamebook/mapEngine"
const m = YELLOW_MAPS["yellow_zone_combat"]
console.log("zone_combat", m.width+"x"+m.height)
for (const [x,y] of [[10,9],[11,9],[12,9],[13,9],[9,9],[8,9],[12,8],[12,10]]) console.log(`(${x},${y}) block=${isBlockingTile(m.tiles[y][x])} tile=${m.tiles[y][x]}`)
