import { getSpecies } from "../src/lib/gamebook/yellow/data/species"
import { getMove } from "../src/lib/gamebook/yellow/data/moves"
const sp:any = getSpecies("mycedruide")
console.log("mycedruide", sp.types, "role:", sp.role)
console.log("learnset complet :")
for (const e of sp.learnset) { const m=getMove(e.moveId); console.log(`  N${String(e.level).padStart(2)} ${e.moveId.padEnd(16)} ${m?.type}/${m?.power||"—"} ${m?.effect?.healPct?"[SOIN]":""}${(m?.power??0)<=0?" [STATUT]":" [DÉGÂTS]"}`) }
const at58 = sp.learnset.filter((e:any)=>e.level<=58).map((e:any)=>e.moveId).slice(-4)
console.log("\n→ 4 attaques EFFECTIVES à N58 :", at58)
console.log("   dont dégâts :", at58.filter((id:string)=>(getMove(id)?.power??0)>0).map((id:string)=>`${id}(${getMove(id)?.type})`))
