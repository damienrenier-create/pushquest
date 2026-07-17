// LECTURE SEULE — valide NGPLUS_ARENA_TEAMS + NGPLUS_BOSS_GIFTS :
//   (1) chaque speciesId existe · (2) chaque niveau est NATUREL · (3) chaque moveId existe · (4) chaque ctId existe.
//   npx tsx scripts/_validate_run2.mts
import { SPECIES } from "../src/lib/gamebook/yellow/data/species"
import { MOVES } from "../src/lib/gamebook/yellow/data/moves"
import { getCt } from "../src/lib/gamebook/yellow/data/cts"
import { NGPLUS_ARENA_TEAMS, NGPLUS_BOSS_GIFTS } from "../src/lib/gamebook/yellow/data/ngplusArenas"

const evoInto: Record<string, number> = {}
for (const s of Object.values(SPECIES) as any[]) if (s.evolution?.method?.level) evoInto[s.evolution.toId] = s.evolution.method.level
const natMin = (id: string) => evoInto[id] ?? 1
const evoAt = (id: string) => (SPECIES as any)[id]?.evolution?.method?.level
const cap = (id: string) => (evoAt(id) ? evoAt(id)! - 1 : Infinity)

let errors = 0
let mons = 0
for (const [tid, team] of Object.entries(NGPLUS_ARENA_TEAMS)) {
    for (const m of team) {
        mons++
        const s = (SPECIES as any)[m.speciesId]
        if (!s) { console.log(`❌ ${tid}: speciesId INCONNU "${m.speciesId}"`); errors++; continue }
        const lo = natMin(m.speciesId), hi = cap(m.speciesId)
        if (m.level < lo || m.level > hi) { console.log(`❌ ${tid}: ${m.speciesId} N${m.level} NON NATUREL (attendu ${lo}-${hi === Infinity ? "∞" : hi})`); errors++ }
        for (const mv of (m.moves ?? [])) if (!(MOVES as any)[mv]) { console.log(`❌ ${tid}: ${m.speciesId} move INCONNU "${mv}"`); errors++ }
        for (const mv of (m.opening ?? [])) if (!(MOVES as any)[mv]) { console.log(`❌ ${tid}: ${m.speciesId} opening INCONNU "${mv}"`); errors++ }
    }
}
for (const [tid, g] of Object.entries(NGPLUS_BOSS_GIFTS)) {
    if (!getCt(g.ctId)) { console.log(`❌ ${tid}: ctId INCONNU "${g.ctId}"`); errors++ }
    if (g.ticket < 10 || g.ticket > 50) { console.log(`❌ ${tid}: ticket ${g.ticket} hors bornes 10-50`); errors++ }
    if (!NGPLUS_ARENA_TEAMS[tid]) { console.log(`❌ ${tid}: boss sans équipe run 2`); errors++ }
}
console.log(`\n${mons} Daemons répartis sur ${Object.keys(NGPLUS_ARENA_TEAMS).length} dresseurs · ${Object.keys(NGPLUS_BOSS_GIFTS).length} boss-cadeaux.`)
console.log(errors === 0 ? "✅ TOUT VALIDE (ids + niveaux naturels + moves + CT)." : `\n⚠️ ${errors} ERREUR(S) — à corriger.`)
