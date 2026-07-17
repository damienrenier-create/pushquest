// LECTURE SEULE — dump complet d'une arène (leader badge + ses gardes) avec équipes + types.
//   npx tsx scripts/_arena_dump.mts
import { SPECIES } from "../src/lib/gamebook/yellow/data/species"
import { TRAINERS } from "../src/lib/gamebook/yellow/data/trainers"
const T = TRAINERS as any[]
const sp = (id: string) => (SPECIES as any)[id]
const evoInto: Record<string, number> = {}
for (const s of Object.values(SPECIES) as any[]) if (s.evolution?.method?.level) evoInto[s.evolution.toId] = s.evolution.method.level
const natMin = (id: string) => evoInto[id] ?? 1
const teamStr = (team: any[]) => team.map((m) => `${sp(m.speciesId)?.name ?? m.speciesId} N${m.level} (${(sp(m.speciesId)?.types ?? []).join("/")}, natN${natMin(m.speciesId)}+)`).join(" · ")

for (const badge of ["plante", "roche"]) {
    const leader = T.find((t) => t.badge === badge)
    if (!leader) continue
    console.log(`\n████ ARÈNE ${badge.toUpperCase()} — ${leader.name} ████`)
    const guardIds: string[] = leader.requiresTrainers ?? []
    for (const gid of guardIds) {
        const g = T.find((t) => t.id === gid)
        if (g) console.log(`  ${g.name.padEnd(14)} : ${teamStr(g.team)}`)
    }
    console.log(`  >> ${leader.name.padEnd(11)} : ${teamStr(leader.team)}`)
}
