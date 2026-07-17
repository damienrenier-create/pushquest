// LECTURE SEULE — arène Volta (élec) complète + pool INSECTE naturel (chaînes d'évo).
//   npx tsx scripts/_arena_volta_insecte.mts
import { SPECIES } from "../src/lib/gamebook/yellow/data/species"
import { TRAINERS } from "../src/lib/gamebook/yellow/data/trainers"
const T = TRAINERS as any[]
const sp = (id: string) => (SPECIES as any)[id]
const evoInto: Record<string, number> = {}
for (const s of Object.values(SPECIES) as any[]) if (s.evolution?.method?.level) evoInto[s.evolution.toId] = s.evolution.method.level
const natMin = (id: string) => evoInto[id] ?? 1
const teamStr = (team: any[]) => team.map((m) => `${sp(m.speciesId)?.name ?? m.speciesId} N${m.level} (${(sp(m.speciesId)?.types ?? []).join("/")}, natN${natMin(m.speciesId)}+)`).join(" · ")

// jamais fieldé ?
const used = new Set<string>()
for (const t of T) for (const m of (t.team ?? [])) used.add(m.speciesId)

const leader = T.find((t) => t.badge === "elec")
if (leader) {
    console.log(`████ ARÈNE ÉLEC — ${leader.name} ████`)
    for (const gid of (leader.requiresTrainers ?? []) as string[]) {
        const g = T.find((t) => t.id === gid)
        if (g) console.log(`  ${g.name.padEnd(16)} : ${teamStr(g.team)}`)
    }
    console.log(`  >> ${leader.name.padEnd(13)} : ${teamStr(leader.team)}`)
}

console.log(`\n████ POOL INSECTE (type contient INSECTE), niveau naturel + évo ████`)
const mons = (Object.values(SPECIES) as any[])
    .filter((s) => (s.types ?? []).includes("INSECTE"))
    .map((s) => ({ name: s.name, id: s.id, types: s.types.join("/"), min: natMin(s.id), evoTo: s.evolution?.toId, evoAt: s.evolution?.method?.level, seen: used.has(s.id) }))
    .sort((a, b) => a.min - b.min)
for (const m of mons) {
    const upper = m.evoAt ? m.evoAt - 1 : "∞"
    console.log(`  N${String(m.min).padStart(2)}-${String(upper).padStart(3)}  ${m.name.padEnd(14)} (${m.types}) ${m.seen ? "[déjà vu]" : "[JAMAIS VU]"}${m.evoTo ? ` → ${m.evoTo}@${m.evoAt}` : " (final)"}`)
}
console.log(`\n  ${mons.length} espèces Insecte. Jamais-vues : ${mons.filter((m) => !m.seen).length}`)
