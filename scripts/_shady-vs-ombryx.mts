import { getSpecies } from "../src/lib/gamebook/yellow/data/species"
import { getMove } from "../src/lib/gamebook/yellow/data/moves"
import { typeEffectiveness } from "../src/lib/gamebook/yellow/battle/typeChart"
const pair = [["shady","ombryx"],["shade","ombraxis"],["shadow","ombraroth"]]
console.log("═══ MATCHUP PAR STADE (le bourreau doit outspeed + immuniser) ═══")
for (const [a,b] of pair){ const S=getSpecies(a)!, O=getSpecies(b)!
  const outspeed = O.baseStats.spe>S.baseStats.spe
  console.log(`\n${S.name} (${S.baseStats.spe} vit / ${S.baseStats.spc} spé-déf)  VS  ${O.name} (${O.baseStats.spe} vit / ${O.baseStats.spc} spé)`)
  console.log(`   Outspeed: ${outspeed?"✅":"❌"} | Ténèbres sur ${S.name}: ×${typeEffectiveness("TENEBRES",S.types)} sur spé-déf ${S.baseStats.spc} | ${S.name} le touche au mieux à ×${Math.max(...(["NORMAL","SPECTRE","COMBAT"] as any[]).map(t=>typeEffectiveness(t,O.types)))}`)
}
console.log("\n═══ LEARNSETS CÔTE À CÔTE (Shadow vs Ombraroth) ═══")
const ls=(id:string)=>getSpecies(id)!.learnset.map(e=>({lvl:e.level,m:getMove(e.moveId)!}))
const a=ls("shadow"), b=ls("ombraroth"); const n=Math.max(a.length,b.length)
console.log("  Niv | SHADOW (proie)                    | OMBRAROTH (bourreau)")
for(let i=0;i<n;i++){
  const fa=a[i]?`N${String(a[i].lvl).padStart(2)} ${a[i].m.name} (${a[i].m.type}${a[i].m.power?" "+a[i].m.power:""})`:""
  const fb=b[i]?`N${String(b[i].lvl).padStart(2)} ${b[i].m.name} (${b[i].m.type}${b[i].m.power?" "+b[i].m.power:""})`:""
  console.log(`      | ${fa.padEnd(33)} | ${fb}`)
}
