// LECTURE SEULE — (a) pré-évo de Chouhanté ; (b) espèces qui apprennent un move POISON, au niveau naturel.
//   npx tsx scripts/_poison_moves.mts
import { SPECIES } from "../src/lib/gamebook/yellow/data/species"
import { MOVES } from "../src/lib/gamebook/yellow/data/moves"

const evoInto: Record<string, number> = {}
for (const s of Object.values(SPECIES) as any[]) if (s.evolution?.method?.level) evoInto[s.evolution.toId] = s.evolution.method.level
const natMin = (id: string) => evoInto[id] ?? 1

// (a) pré-évo de chouhante
const pre = (Object.values(SPECIES) as any[]).find((s) => s.evolution?.toId === "chouhante")
if (pre) console.log(`PRÉ-ÉVO Chouhanté → ${pre.name} (id=${pre.id}, ${pre.types.join("/")}, natN${natMin(pre.id)}+, évolue@${pre.evolution.method.level})`)
else console.log("PRÉ-ÉVO Chouhanté → aucune (base introuvable)")

// (b) moves de type POISON
const poisonMoves = new Set(Object.values(MOVES as any).filter((m: any) => m.type === "POISON").map((m: any) => m.id))
console.log(`\nMoves POISON existants : ${[...poisonMoves].join(", ")}\n`)

// espèces qui en apprennent un, au niveau NATUREL (max(learnLevel, natMin)), ≤40
type Row = { name: string; types: string; at: number; moves: string }
const rows: Row[] = []
for (const s of Object.values(SPECIES) as any[]) {
    const learns = (s.learnset || []).filter((l: any) => poisonMoves.has(l.moveId))
    if (!learns.length) continue
    const nm = natMin(s.id)
    const at = Math.min(...learns.map((l: any) => Math.max(l.level, nm)))
    rows.push({ name: s.name, types: (s.types || []).join("/"), at, moves: learns.map((l: any) => `${l.moveId}@${l.level}`).join(",") })
}
rows.sort((a, b) => a.at - b.at)
console.log(`Espèces apprenant un move POISON (jouables dès N<at>, stade naturel) :`)
for (const r of rows) console.log(`  N${String(r.at).padStart(2)}+  ${r.name.padEnd(14)} (${r.types}) — ${r.moves}`)
console.log(`\nTotal ${rows.length}. ≤32 : ${rows.filter((r) => r.at <= 32).length}`)
