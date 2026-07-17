// LECTURE SEULE — pool COMBAT au niveau naturel + confirme si COMBAT est dans la Ligue.
//   npx tsx scripts/_combat_pool.mts
import { SPECIES } from "../src/lib/gamebook/yellow/data/species"
import { TRAINERS } from "../src/lib/gamebook/yellow/data/trainers"
const evoInto: Record<string, number> = {}
for (const s of Object.values(SPECIES) as any[]) if (s.evolution?.method?.level) evoInto[s.evolution.toId] = s.evolution.method.level
const natMin = (id: string) => evoInto[id] ?? 1
const sp = (id: string) => (SPECIES as any)[id]

const mons = (Object.values(SPECIES) as any[])
    .filter((s) => (s.types ?? []).includes("COMBAT"))
    .map((s) => ({ name: s.name, types: s.types.join("/"), min: natMin(s.id) }))
    .sort((a, b) => a.min - b.min)
console.log(`████ POOL COMBAT — ${mons.length} espèces (≤32 : ${mons.filter((m) => m.min <= 32).length}) ████`)
for (const m of mons) console.log(`  N${String(m.min).padStart(2)}+  ${m.name.padEnd(14)} (${m.types})`)

// Combat dans la Ligue ?
const ligue = (TRAINERS as any[]).filter((t) => t.id?.startsWith("y_ligue_"))
for (const l of ligue) {
    const hasCombat = l.team.some((m: any) => (sp(m.speciesId)?.types ?? []).includes("COMBAT"))
    if (hasCombat) {
        const c = l.team.filter((m: any) => (sp(m.speciesId)?.types ?? []).includes("COMBAT")).map((m: any) => sp(m.speciesId)?.name)
        console.log(`  LIGUE ${l.name} field du COMBAT : ${c.join(", ")}`)
    }
}
