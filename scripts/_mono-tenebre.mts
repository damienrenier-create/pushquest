import { typeEffectiveness } from "../src/lib/gamebook/yellow/battle/typeChart"
import type { PokeType } from "../src/lib/gamebook/yellow/battle/types"
const shadyMoves: [string,PokeType][] = [["Vive-Attaque (prio)","NORMAL"],["Griffe Spectrale","SPECTRE"],["Crochet du Maître","COMBAT"],["Tranche/Plaquage","NORMAL"]]
const opts: [string,PokeType[]][] = [["TÉNÈBRES/SPECTRE (actuel)",["TENEBRES","SPECTRE"]],["mono-TÉNÈBRES",["TENEBRES"]],["TÉNÈBRES/FEU",["TENEBRES","FEU"]]]
for (const [name,types] of opts){
  console.log(`\n■ ${name}`)
  for (const [mv,t] of shadyMoves) console.log(`   ${mv.padEnd(22)} (${t}) → ×${typeEffectiveness(t,types)}`)
  console.log(`   → Ténèbres du némésis SUR Shady : ×${typeEffectiveness("TENEBRES",["NORMAL","SPECTRE"])} (inchangé, OHKO)`)
}
