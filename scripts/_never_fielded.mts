// LECTURE SEULE — espèces qu'AUCUN dresseur ne field (jamais, pas une fois), triées par type puis niveau naturel.
//   npx tsx scripts/_never_fielded.mts
import { SPECIES } from "../src/lib/gamebook/yellow/data/species"
import { TRAINERS } from "../src/lib/gamebook/yellow/data/trainers"
const evoInto: Record<string, number> = {}
for (const s of Object.values(SPECIES) as any[]) if (s.evolution?.method?.level) evoInto[s.evolution.toId] = s.evolution.method.level
const natMin = (id: string) => evoInto[id] ?? 1

// tous les speciesId fieldés par un dresseur quelconque
const used = new Set<string>()
for (const t of TRAINERS as any[]) for (const m of (t.team ?? [])) used.add(m.speciesId)

const never = (Object.values(SPECIES) as any[])
    .filter((s) => !used.has(s.id))
    .map((s) => ({ name: s.name, id: s.id, types: (s.types ?? []).join("/"), min: natMin(s.id) }))
    .sort((a, b) => a.types.localeCompare(b.types) || a.min - b.min)

console.log(`████ ${never.length} espèces JAMAIS fieldées par un dresseur (sur ${Object.keys(SPECIES).length} au total) ████\n`)
for (const n of never) console.log(`  ${n.types.padEnd(16)} N${String(n.min).padStart(2)}+  ${n.name}`)

// regroupé par type principal pour voir les "familles inédites"
console.log(`\n— Par présence de type —`)
for (const ty of ["NORMAL","FEU","EAU","PLANTE","ELEC","GLACE","COMBAT","POISON","SOL","VOL","PSY","INSECTE","ROCHE","SPECTRE","DRAGON"]) {
    const list = never.filter((n) => n.types.split("/").includes(ty))
    if (list.length) console.log(`  ${ty.padEnd(8)} (${list.length}) : ${list.map((n) => `${n.name} N${n.min}+`).join(" · ")}`)
}
