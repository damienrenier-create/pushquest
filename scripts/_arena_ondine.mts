// LECTURE SEULE — arène Ondine (eau) complète + pool JAMAIS-VUS ≤53 groupé par type (pour l'éclectique).
//   npx tsx scripts/_arena_ondine.mts
import { SPECIES } from "../src/lib/gamebook/yellow/data/species"
import { TRAINERS } from "../src/lib/gamebook/yellow/data/trainers"
const T = TRAINERS as any[]
const sp = (id: string) => (SPECIES as any)[id]
const evoInto: Record<string, number> = {}
for (const s of Object.values(SPECIES) as any[]) if (s.evolution?.method?.level) evoInto[s.evolution.toId] = s.evolution.method.level
const natMin = (id: string) => evoInto[id] ?? 1
const evoAt = (id: string) => (SPECIES as any)[id]?.evolution?.method?.level
const teamStr = (team: any[]) => team.map((m) => `${sp(m.speciesId)?.name ?? m.speciesId} N${m.level} (${(sp(m.speciesId)?.types ?? []).join("/")}, natN${natMin(m.speciesId)}+)`).join(" · ")

const used = new Set<string>()
for (const t of T) for (const m of (t.team ?? [])) used.add(m.speciesId)

const leader = T.find((t) => t.badge === "eau")
if (leader) {
    console.log(`████ ARÈNE EAU — ${leader.name} ████`)
    for (const gid of (leader.requiresTrainers ?? []) as string[]) {
        const g = T.find((t) => t.id === gid)
        if (g) console.log(`  ${g.name.padEnd(16)} : ${teamStr(g.team)}`)
    }
    console.log(`  >> ${leader.name.padEnd(13)} : ${teamStr(leader.team)}`)
}

// déjà utilisés dans mes arènes run 2 (Vol/Psy/Pyra/Volta) — à éviter pour garder Ondine distincte
const runUsed = new Set(["piouflot","draclet","corvenin","plumiot","colibraise","rembodo","cornaissant",
    "nouillon","vermisaint","blaziper","flamaspic","jerbiwat","escaroche","limaroche","hibouh",
    "glaceer","carlembre","faukon","pyrenard","marteloutan","chouhante","ondulo","fourmilierre","sylvours","frappard","broutame","flamkure","namizeus","carlinou",
    "ruffiant","revemante","formiguer","necarabee","regnantaur","ombrapanthe","glacirex","gloutanoir","brook","bouh","lampignon","sporbeo"])

console.log(`\n████ JAMAIS-VUS ≤53 encore LIBRES (hors arènes run2 déjà faites), par type ████`)
const never = (Object.values(SPECIES) as any[])
    .filter((s) => !used.has(s.id) && natMin(s.id) <= 53)
    .map((s) => ({ id: s.id, name: s.name, types: (s.types ?? []).join("/"), min: natMin(s.id), up: evoAt(s.id) ? evoAt(s.id)! - 1 : "∞", free: !runUsed.has(s.id) }))
for (const ty of ["NORMAL","FEU","EAU","PLANTE","ELEC","GLACE","COMBAT","POISON","SOL","VOL","PSY","INSECTE","ROCHE","SPECTRE","DRAGON"]) {
    const list = never.filter((n) => n.types.split("/").includes(ty))
    if (!list.length) continue
    console.log(`  ${ty.padEnd(8)}: ${list.map((n) => `${n.free ? "" : "~"}${n.name} N${n.min}-${n.up}${n.free ? "" : "(pris)"}`).join(" · ")}`)
}
console.log(`\n  (~ = déjà casé dans une arène run2 ; sans ~ = libre pour Ondine)`)
