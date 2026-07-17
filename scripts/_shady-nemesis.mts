import { typeMultiplier, moveCategory } from "../src/lib/gamebook/yellow/battle/typeChart"
import type { PokeType } from "../src/lib/gamebook/yellow/battle/types"
const ALL: PokeType[] = ["NORMAL","COMBAT","VOL","POISON","SOL","ROCHE","INSECTE","SPECTRE","METAL","FEU","EAU","PLANTE","ELEC","GLACE","PSY","DRAGON","FEE"]
const SHADY: PokeType[] = ["NORMAL","SPECTRE"]
// Offense de Shady : STAB NORMAL + SPECTRE (physique), + COMBAT (crochet_maitre). Priorité Vive-Attaque (NORMAL).
const SHADY_ATK: PokeType[] = ["NORMAL","SPECTRE","COMBAT"]

const eff = (atk: PokeType, def: PokeType[]) => def.reduce((m, d) => m * typeMultiplier(atk, d), 1)

console.log("=== 1) Faiblesses de SHADY (ce qui le frappe super) — un type d'ATK vs NORMAL/SPECTRE ===")
for (const t of ALL) { const m = eff(t, SHADY); if (m > 1) console.log(`   ${t} ×${m}`) }
console.log("   (rien ci-dessus = AUCUNE faiblesse de type)")
console.log("\n=== 2) Immunités/résistances de SHADY ===")
for (const t of ALL) { const m = eff(t, SHADY); if (m < 1) console.log(`   ${t} ×${m}`) }

console.log("\n=== 3) Meilleurs TYPES DÉFENSIFS contre l'OFFENSE de Shady (NORMAL+SPECTRE+COMBAT) ===")
const rows: {t1:PokeType;t2:PokeType;incoming:number}[] = []
for (let i=0;i<ALL.length;i++) for (let j=i;j<ALL.length;j++){
  const def = i===j?[ALL[i]]:[ALL[i],ALL[j]]
  // pire coup de Shady sur ce def (max des 3 types d'atk)
  const worst = Math.max(...SHADY_ATK.map(a => eff(a, def)))
  rows.push({t1:ALL[i],t2:ALL[j],incoming:worst})
}
rows.sort((a,b)=>a.incoming-b.incoming)
console.log("   (incoming = pire multiplicateur de Shady sur ce type — plus bas = mieux encaisse)")
for (const r of rows.slice(0,12)) console.log(`   ${r.t1}${r.t1!==r.t2?"/"+r.t2:""}  →  Shady tape au mieux ×${r.incoming}`)
