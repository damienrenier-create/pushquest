// LECTURE SEULE — pools SOL et NORMAL au niveau naturel (alternatives à Poison pour Pyra niv 32).
//   npx tsx scripts/_sol_normal_pool.mts
import { SPECIES } from "../src/lib/gamebook/yellow/data/species"
const evoInto: Record<string, number> = {}
for (const s of Object.values(SPECIES) as any[]) if (s.evolution?.method?.level) evoInto[s.evolution.toId] = s.evolution.method.level
const natMin = (id: string) => evoInto[id] ?? 1

for (const ty of ["SOL", "NORMAL"]) {
    const mons = (Object.values(SPECIES) as any[])
        .filter((s) => (s.types ?? []).includes(ty))
        .map((s) => ({ name: s.name, types: s.types.join("/"), min: natMin(s.id) }))
        .sort((a, b) => a.min - b.min)
    console.log(`\n████ POOL ${ty} — ${mons.length} espèces (≤32 : ${mons.filter((m) => m.min <= 32).length}) ████`)
    for (const m of mons) console.log(`  N${String(m.min).padStart(2)}+  ${m.name.padEnd(14)} (${m.types})`)
}
