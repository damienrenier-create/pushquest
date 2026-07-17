// LECTURE SEULE — audit : quelles espèces (tous types) apprennent un move INSECTE, à quel niveau NATUREL.
//   npx tsx scripts/_bug_audit.mts
import { SPECIES } from "../src/lib/gamebook/yellow/data/species"

const BUG = new Set(["dard_nuee", "boul_pollen", "morsure", "dard_mortel", "dard_fatal"])
// niveau min auquel un STADE existe naturellement (0 pour une base ; sinon le niveau d'évolution qui y mène)
const evoLvlInto: Record<string, number> = {}
for (const s of Object.values(SPECIES) as any[]) if (s.evolution?.method?.level) evoLvlInto[s.evolution.toId] = s.evolution.method.level

const rows: { name: string; types: string; natMin: number; bugAtOr: number; moves: string }[] = []
for (const s of Object.values(SPECIES) as any[]) {
    const bugLearn = (s.learnset || []).filter((l: any) => BUG.has(l.moveId))
    if (!bugLearn.length) continue
    const natMin = evoLvlInto[s.id] ?? 1
    const earliest = Math.min(...bugLearn.map((l: any) => Math.max(l.level, natMin)))
    rows.push({ name: s.name, types: (s.types || []).join("/"), natMin, bugAtOr: earliest, moves: bugLearn.map((l: any) => `${l.moveId}@${l.level}`).join(",") })
}
rows.sort((a, b) => a.bugAtOr - b.bugAtOr)
console.log(`Espèces avec un move INSECTE dans leur learnset (jouables dès N<bugAtOr>, stade naturel) :\n`)
for (const r of rows) console.log(`  N${String(r.bugAtOr).padStart(2)}+  ${r.name.padEnd(14)} (${r.types}) — ${r.moves}`)
console.log(`\nTotal : ${rows.length} espèces. Jouables à une arène niv ≤16 : ${rows.filter((r) => r.bugAtOr <= 16).length}.`)
