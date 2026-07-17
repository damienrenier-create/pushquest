// LECTURE SEULE — valide que tous les speciesId des pools RUN 2 (Route Nord + Grotte) existent
// et que les BASES (hors noEvolve) sont bien des têtes de lignée (natMin ≤ 12, catchables tôt).
//   npx tsx scripts/_validate_ngplus_zones.mts
import { SPECIES } from "../src/lib/gamebook/yellow/data/species"
const evoInto: Record<string, number> = {}
for (const s of Object.values(SPECIES) as any[]) if (s.evolution?.method?.level) evoInto[s.evolution.toId] = s.evolution.method.level
const natMin = (id: string) => evoInto[id] ?? 1

// bases (speciesAtLevel donne le stade naturel du niveau) — doivent avoir natMin 1
const BASES = ["plumiot","couperin","cailloutchi","ruffiant","cornaissant","blaziper","jerbiwat","bouh","glacirex","gouttiny","braisille","fennaise","feuillichot","carlinou","draclet","pantheon","tetardoc","lavapetit","rembodo","limaroche","marmoterre","loutrille","sporbeo","revemante","braisecaille","mottoche","quadroc"]
// noEvolve (spawnés tels quels) — juste l'existence + type
const NOEVOLVE = ["namicha","orcaline"]

let err = 0
for (const id of [...BASES, ...NOEVOLVE]) {
    const s = (SPECIES as any)[id]
    if (!s) { console.log(`❌ speciesId INCONNU: "${id}"`); err++; continue }
}
for (const id of BASES) {
    const nm = natMin(id)
    if (nm > 12) console.log(`⚠️  ${id} natMin ${nm} > 12 (mid-form ? via speciesAtLevel ça devrait rester ok, mais à vérifier)`)
}
for (const id of NOEVOLVE) { const s = (SPECIES as any)[id]; if (s) console.log(`ℹ️  ${id} (${s.types.join("/")}) noEvolve — spawné tel quel`) }
console.log(err === 0 ? `\n✅ ${BASES.length + NOEVOLVE.length} speciesId valides.` : `\n⚠️ ${err} inconnu(s).`)
