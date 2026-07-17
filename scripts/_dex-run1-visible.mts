import { SPECIES, SPECIES_IDS, isDexHidden } from "../src/lib/gamebook/yellow/data/species"

// Joueur RUN 1 non-champion, rien capturé/vu.
const visRun1 = (id:string) => !isDexHidden(SPECIES[id], [], false, false, false, false, [])
const visRun1Champ = (id:string) => !isDexHidden(SPECIES[id], [], true, false, false, false, [])

const all = SPECIES_IDS.map(id=>({id, dex:(SPECIES[id] as any).dexNo, sp:SPECIES[id] as any}))
                       .filter(x=>typeof x.dex==="number").sort((a,b)=>a.dex-b.dex)

const visible = all.filter(x=>visRun1(x.id))
const hidden  = all.filter(x=>!visRun1(x.id))
console.log(`RUN 1 non-champion : ${visible.length} visibles / ${all.length} espèces (masquées ${hidden.length})`)
console.log(`Masquées : ${hidden.map(x=>`${x.dex} ${x.id}`).join(", ")}`)
console.log()
// Espèces visibles au dex NUMÉRO ÉLEVÉ (>=115) = zone où vit le contenu run2/run3 → toute fuite se voit ici :
console.log("VISIBLES run1 avec dexNo >= 115 (à surveiller — leak potentiel run2/3) :")
for (const x of visible.filter(x=>x.dex>=115)) {
  const f = [x.sp.runThreeOnly&&"R3", x.sp.runTwoOnly&&"R2", x.sp.postLeague&&"postL", x.sp.isDexHidden&&"hidUntil"].filter(Boolean).join(",")||"—"
  console.log(`  dex ${x.dex}  ${x.id.padEnd(16)}  flags:${f}`)
}
