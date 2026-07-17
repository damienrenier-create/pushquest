// LECTURE SEULE — prépare l'arène Pyra→Poison + vérifie Chouhanté N5.
//   npx tsx scripts/_arena_poison.mts
import { SPECIES } from "../src/lib/gamebook/yellow/data/species"
import { TRAINERS } from "../src/lib/gamebook/yellow/data/trainers"
const T = TRAINERS as any[]
const sp = (id: string) => (SPECIES as any)[id]
const evoInto: Record<string, number> = {}
for (const s of Object.values(SPECIES) as any[]) if (s.evolution?.method?.level) evoInto[s.evolution.toId] = s.evolution.method.level
const natMin = (id: string) => evoInto[id] ?? 1
const teamStr = (team: any[]) => team.map((m) => `${sp(m.speciesId)?.name ?? m.speciesId} N${m.level} (${(sp(m.speciesId)?.types ?? []).join("/")}, natN${natMin(m.speciesId)}+)`).join(" · ")

// (0) Vérif Chouhanté (par nom, insensible casse)
const chou = (Object.values(SPECIES) as any[]).find((s) => (s.name || "").toLowerCase().includes("chouhant"))
if (chou) console.log(`CHECK Chouhanté → id=${chou.id} types=${chou.types.join("/")} natMin=N${natMin(chou.id)}+ (N5 ${5 >= natMin(chou.id) ? "OK ✓" : "!! IMPOSSIBLE"})`)
else console.log("CHECK Chouhanté → INTROUVABLE (nom ?)")

// (1) Arène Feu (Pyra) complète
const leader = T.find((t) => t.badge === "feu")
if (leader) {
    console.log(`\n████ ARÈNE FEU — ${leader.name} ████`)
    for (const gid of (leader.requiresTrainers ?? []) as string[]) {
        const g = T.find((t) => t.id === gid)
        if (g) console.log(`  ${g.name.padEnd(16)} : ${teamStr(g.team)}`)
    }
    console.log(`  >> ${leader.name.padEnd(13)} : ${teamStr(leader.team)}`)
}

// (2) Pool POISON naturel (≤32), trié par natMin
console.log(`\n████ POOL POISON (type contient POISON), niveau naturel ████`)
const mons = (Object.values(SPECIES) as any[])
    .filter((s) => (s.types ?? []).includes("POISON"))
    .map((s) => ({ name: s.name, types: s.types.join("/"), min: natMin(s.id), evoTo: s.evolution?.toId, evoAt: s.evolution?.method?.level }))
    .sort((a, b) => a.min - b.min)
for (const m of mons) console.log(`  N${String(m.min).padStart(2)}+  ${m.name.padEnd(14)} (${m.types})${m.evoTo ? ` → ${m.evoTo}@${m.evoAt}` : ""}`)
console.log(`\n  ${mons.length} espèces Poison. ≤32 : ${mons.filter((m) => m.min <= 32).length}`)
