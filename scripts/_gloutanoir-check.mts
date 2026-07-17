import { readFileSync } from "node:fs"
import { getSpecies } from "../src/lib/gamebook/yellow/data/species"
import { CTS, canLearnCt } from "../src/lib/gamebook/yellow/data/cts"
import { getMove } from "../src/lib/gamebook/yellow/data/moves"
const sp:any = getSpecies("gloutanoir")
console.log("gloutanoir types:", sp.types, "| role:", sp.role)
console.log("learnset:", (sp.learnset??[]).map((e:any)=>`${e.level}:${e.moveId}`).join(" "))
console.log("CT légales (statut/utilité) pour gloutanoir:")
for (const c of CTS as any[]) { if (canLearnCt(sp,c)) { const m=getMove(c.moveId); if (m && m.power<=0) console.log(`  ${c.label} ${c.moveId} (${m.type})`) } }
// l'artefact : moves d'origine de gloutanoir dans T01
const raw = JSON.parse(readFileSync("C:/Users/Sartay/AppData/Local/Temp/claude/C--Users-Sartay/14aec05a-7971-4c2c-8840-31905f0ba3a1/tasks/wneemmi27.output","utf8")).result.teams
const g = raw[0].team.mons.find((m:any)=>m.speciesId==="gloutanoir")
console.log("ARTEFACT gloutanoir moves:", JSON.stringify(g.moves), "| rationale:", String(g.rationale).slice(0,220))
