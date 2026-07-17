import { getSpecies } from "../src/lib/gamebook/yellow/data/species"
const bst=(s:any)=>s.baseStats.hp+s.baseStats.atk+s.baseStats.def+s.baseStats.spe+s.baseStats.spc
for (const grp of [["shady","shade","shadow"],["ombryx","ombraxis","ombraroth"]]) {
  console.log("──")
  for (const id of grp){ const s=getSpecies(id)! as any; const b=s.baseStats
    console.log(`  ${s.name.padEnd(10)} ${b.hp}/${b.atk}/${b.def}/${b.spe}/${b.spc}  = BST ${bst(s)}`) }
  console.log(`  TOTAL lignée = ${grp.reduce((a,id)=>a+bst(getSpecies(id)),0)}`)
}
