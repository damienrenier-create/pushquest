import { getMove } from "../src/lib/gamebook/yellow/data/moves"
import { moveCategory } from "../src/lib/gamebook/yellow/battle/typeChart"
const ls = [[5,"charge"],[5,"jet_de_sable"],[12,"vive_attaque"],[18,"ombre_furtive"],[24,"griffe_spectrale"],[30,"danse_lames"],[36,"crochet_maitre"],[42,"tranche"],[48,"hypnose"],[54,"plaquage"]]
for (const [lvl, id] of ls) {
  const m = getMove(id as string) as any
  if (!m) { console.log(`  N${lvl}  ${id}  ⚠️ INCONNU`); continue }
  const cat = m.power>0 ? moveCategory(m.type) : "STATUT"
  console.log(`  N${String(lvl).padStart(2)}  ${(m.name).padEnd(18)} ${String(m.type).padEnd(8)} ${m.power>0?("pw"+m.power).padEnd(6):"—".padEnd(6)} ${cat}  ${m.effect ? JSON.stringify(m.effect).slice(0,55) : ""}`)
}
