// LECTURE SEULE — audit pour le re-typage des arènes run 2.
// (1) Types déjà représentés dans les ARÈNES (5 badges) + la LIGUE (Conseil 4 + Maître).
// (2) Types LIBRES. (3) Pour chaque type LIBRE : espèces jouables au niveau NATUREL, par bande.
//   npx tsx scripts/_arena_types_audit.mts
import { SPECIES } from "../src/lib/gamebook/yellow/data/species"
import { TRAINERS } from "../src/lib/gamebook/yellow/data/trainers"

const ALL_TYPES = ["NORMAL", "FEU", "EAU", "PLANTE", "ELEC", "GLACE", "COMBAT", "POISON", "SOL", "VOL", "PSY", "INSECTE", "ROCHE", "SPECTRE", "DRAGON"]
const sp = (id: string) => (SPECIES as any)[id]

// niveau min NATUREL d'un stade (0/1 pour base, sinon le niveau d'évolution qui y mène)
const evoInto: Record<string, number> = {}
for (const s of Object.values(SPECIES) as any[]) if (s.evolution?.method?.level) evoInto[s.evolution.toId] = s.evolution.method.level
const natMin = (id: string) => evoInto[id] ?? 1

const T = TRAINERS as any[]
const byId = (id: string) => T.find((t) => t.id === id)
// Arènes : les 5 leaders (badge) → type dominant du leader = son thème.
const gymLeaders = T.filter((t) => t.badge)
const gymTypes = new Set<string>()
for (const g of gymLeaders) { const teamTypes = g.team.flatMap((m: any) => sp(m.speciesId)?.types ?? []); console.log(`ARÈNE badge=${g.badge} · ${g.name} → types équipe : ${[...new Set(teamTypes)].join(",")}`) }
// On prend les 5 badges comme thèmes officiels :
const BADGE_TYPE: Record<string, string> = { plante: "PLANTE", roche: "ROCHE", feu: "FEU", elec: "ELEC", eau: "EAU" }
Object.values(BADGE_TYPE).forEach((x) => gymTypes.add(x))

// Ligue : Conseil 4 + Maître → union des types de leurs équipes.
const ligue = T.filter((t) => t.id?.startsWith("y_ligue_"))
const ligueTypes = new Set<string>()
for (const l of ligue) { const tt = [...new Set(l.team.flatMap((m: any) => sp(m.speciesId)?.types ?? []))]; console.log(`LIGUE ${l.name} → ${tt.join(",")}`); tt.forEach((x: any) => ligueTypes.add(x)) }

const used = new Set([...gymTypes, ...ligueTypes])
// TYPES FRAIS par THÈME (arènes Plante/Roche/Feu/Élec/Eau + spécialités Ligue Glace/Combat/Spectre/Dragon) :
const free = ["SOL", "NORMAL", "POISON", "VOL", "PSY", "INSECTE"]
void used, ALL_TYPES
console.log(`\n===> TYPES ARÈNES : ${[...gymTypes].join(", ")}`)
console.log(`===> TYPES LIGUE : ${[...ligueTypes].sort().join(", ")}`)
console.log(`===> TYPES LIBRES (jamais en arène ni ligue) : ${free.join(", ")}\n`)

// Pour chaque type LIBRE : espèces dont le TYPE contient ce type, au niveau naturel min.
const bands = [16, 21, 32, 40, 53]
for (const ty of free) {
    const mons = (Object.values(SPECIES) as any[]).filter((s) => (s.types ?? []).includes(ty)).map((s) => ({ name: s.name, types: s.types.join("/"), min: natMin(s.id) })).sort((a, b) => a.min - b.min)
    const perBand = bands.map((b) => mons.filter((m) => m.min <= b).length)
    console.log(`■ ${ty} — ${mons.length} espèces de ce TYPE. Jouables cumulées par bande [≤16,≤21,≤32,≤40,≤53] = [${perBand.join(", ")}]`)
    console.log(`   ${mons.map((m) => `${m.name}(N${m.min}+,${m.types})`).join(" · ")}`)
}
