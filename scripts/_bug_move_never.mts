// LECTURE SEULE — espèces JAMAIS VUES (aucun dresseur) qui apprennent un move INSECTE, niveau naturel ≤40.
//   npx tsx scripts/_bug_move_never.mts
import { SPECIES } from "../src/lib/gamebook/yellow/data/species"
import { MOVES } from "../src/lib/gamebook/yellow/data/moves"
import { TRAINERS } from "../src/lib/gamebook/yellow/data/trainers"
const evoInto: Record<string, number> = {}
for (const s of Object.values(SPECIES) as any[]) if (s.evolution?.method?.level) evoInto[s.evolution.toId] = s.evolution.method.level
const natMin = (id: string) => evoInto[id] ?? 1
const evoAt = (id: string) => (SPECIES as any)[id]?.evolution?.method?.level

const used = new Set<string>()
for (const t of TRAINERS as any[]) for (const m of (t.team ?? [])) used.add(m.speciesId)

const bugMoves = new Set(Object.values(MOVES as any).filter((m: any) => m.type === "INSECTE").map((m: any) => m.id))
console.log(`Moves INSECTE : ${[...bugMoves].join(", ")}\n`)

type Row = { name: string; types: string; at: number; up: number | string; moves: string }
const rows: Row[] = []
for (const s of Object.values(SPECIES) as any[]) {
    if (used.has(s.id)) continue // jamais vus seulement
    const learns = (s.learnset || []).filter((l: any) => bugMoves.has(l.moveId))
    if (!learns.length) continue
    const nm = natMin(s.id)
    const at = Math.min(...learns.map((l: any) => Math.max(l.level, nm)))
    const ev = evoAt(s.id)
    rows.push({ name: s.name, types: (s.types || []).join("/"), at, up: ev ? ev - 1 : "∞", moves: learns.map((l: any) => `${l.moveId}@${l.level}`).join(",") })
}
rows.sort((a, b) => a.at - b.at)
console.log(`JAMAIS-VUES apprenant un move INSECTE (jouables N<at>, stade naturel, borne haute) :`)
for (const r of rows) console.log(`  N${String(r.at).padStart(2)}-${String(r.up).padStart(3)}  ${r.name.padEnd(14)} (${r.types}) — ${r.moves}`)
console.log(`\n  ${rows.length} padders jamais-vus. ≤40 : ${rows.filter((r) => r.at <= 40).length}`)
