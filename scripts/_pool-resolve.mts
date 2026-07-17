import { readFileSync, writeFileSync } from "node:fs"
import { getMoveByName, getMove } from "../src/lib/gamebook/yellow/data/moves"
import { HELD_ITEMS } from "../src/lib/gamebook/yellow/data/heldItems"
import { getSpecies } from "../src/lib/gamebook/yellow/data/species"

const p = "C:/Users/Sartay/AppData/Local/Temp/claude/C--Users-Sartay/14aec05a-7971-4c2c-8840-31905f0ba3a1/tasks/wneemmi27.output"
const teams = JSON.parse(readFileSync(p, "utf8")).result.teams

const norm = (s:string)=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"")
const itemByName = new Map<string,string>()
for (const [id,it] of Object.entries(HELD_ITEMS)) { itemByName.set(norm((it as any).name), id); itemByName.set(norm(id), id) }
const clean = (s:string)=>String(s).split(/[(—]/)[0].trim()
const resolveMove = (raw:string):string|null => {
  const c = clean(raw)
  const byName = getMoveByName(c); if (byName) return byName.id
  const byId = getMove(norm(c).replace(/([a-z])([0-9])/g,"$1$2")); // try normalized-ish
  if (byId) return byId.id
  const asId = getMove(c); if (asId) return asId.id
  const snake = getMove(c.toLowerCase().replace(/\s+/g,"_")); if (snake) return snake.id
  return null
}

const problems:string[] = []
const out = teams.map((t:any, ti:number) => {
  const team = t.team
  const mons = team.mons.map((m:any) => {
    if (!getSpecies(m.speciesId)) problems.push(`T${ti+1} species INCONNUE: ${m.speciesId}`)
    const moveIds = (m.moves as string[]).map((nm) => {
      const id = resolveMove(nm)
      if (!id) { problems.push(`T${ti+1} ${m.speciesId} move NON RÉSOLU: "${nm}"`); return `??` }
      return id
    })
    let heldItemId:string|undefined
    if (m.heldItem) {
      heldItemId = itemByName.get(norm(clean(m.heldItem)))
      if (!heldItemId) problems.push(`T${ti+1} ${m.speciesId} objet NON RÉSOLU: "${m.heldItem}"`)
    }
    return { speciesId: m.speciesId, moveIds, heldItemId }
  })
  return { archetype: t.archetype, identity: String(team.identity??"").slice(0,60), mons }
})

writeFileSync("scripts/_pool-resolved.json", JSON.stringify(out, null, 1))
console.log(`teams: ${out.length} | mons: ${out.reduce((s:number,t:any)=>s+t.mons.length,0)}`)
console.log(`PROBLÈMES RESTANTS: ${problems.length}`)
problems.slice(0,60).forEach(x=>console.log("  - "+x))
