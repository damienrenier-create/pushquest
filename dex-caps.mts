// dex-caps.mts — maxima par stat des finales NON-légendaires, pour caler les caps du Créateur.
//   npx tsx dex-caps.mts
import { SPECIES } from "./src/lib/gamebook/yellow/data/species"
import type { SpeciesData, StatKey } from "./src/lib/gamebook/yellow/battle/types"

const KEYS: StatKey[] = ["hp", "atk", "def", "spe", "spc"]
const BST = (s: SpeciesData) => KEYS.reduce((a, k) => a + s.baseStats[k], 0)
const list = Object.values(SPECIES)

// Finales = espèces qui n'évoluent plus (pas de evolution.toId).
const finals = list.filter((s) => !s.evolution?.toId)
const nonLeg = finals.filter((s) => !s.exclusive)
const legend = finals.filter((s) => s.exclusive)

const maxBy = (arr: SpeciesData[], k: StatKey) => arr.reduce((m, s) => Math.max(m, s.baseStats[k]), 0)
const argmax = (arr: SpeciesData[], k: StatKey) => arr.reduce((m, s) => (s.baseStats[k] > m.baseStats[k] ? s : m), arr[0])

console.log(`Finales : ${finals.length} · non-légendaires : ${nonLeg.length} · exclusives/légendaires : ${legend.length}`)
console.log(`\nMAX par stat chez les finales NON-LÉGENDAIRES :`)
for (const k of KEYS) console.log(`  ${k.padEnd(4)} : ${String(maxBy(nonLeg, k)).padStart(3)}  (${argmax(nonLeg, k).name})`)

// Finales de lignées 3-STADES uniquement (le créateur fait toujours 3 stades).
const parentOf = new Map<string, string>()
for (const s of list) if (s.evolution?.toId) parentOf.set(s.evolution.toId, s.id)
function depth(s: SpeciesData): number { let d = 1, cur = s.id; while (parentOf.has(cur)) { d++; cur = parentOf.get(cur)! } return d }
const stage3 = nonLeg.filter((s) => depth(s) === 3)
console.log(`\nMAX par stat chez les finales STADE-3 NON-LÉGENDAIRES (${stage3.length}) :`)
for (const k of KEYS) console.log(`  ${k.padEnd(4)} : ${String(maxBy(stage3, k)).padStart(3)}  (${argmax(stage3, k).name})  → cap +10% = ${Math.round(maxBy(stage3, k) * 1.10)}`)
console.log(`\nMAX par stat chez les LÉGENDAIRES (info) :`)
for (const k of KEYS) console.log(`  ${k.padEnd(4)} : ${String(maxBy(legend, k)).padStart(3)}  (${argmax(legend, k).name})`)

// Triade offensive atk+spc+spe : max chez les non-légendaires (pour caler une contrainte de somme).
const triad = (s: SpeciesData) => s.baseStats.atk + s.baseStats.spc + s.baseStats.spe
const triadMax = nonLeg.reduce((m, s) => (triad(s) > triad(m) ? s : m), nonLeg[0])
const triadLegMax = legend.length ? legend.reduce((m, s) => (triad(s) > triad(m) ? s : m), legend[0]) : null
console.log(`\nTriade offensive (atk+spc+spe) :`)
console.log(`  max non-légendaire : ${triad(triadMax)} (${triadMax.name} — atk${triadMax.baseStats.atk}/spc${triadMax.baseStats.spc}/spe${triadMax.baseStats.spe})`)
if (triadLegMax) console.log(`  max légendaire     : ${triad(triadLegMax)} (${triadLegMax.name})`)
const triads = nonLeg.map(triad).sort((a, b) => b - a)
console.log(`  top10 non-lég : ${triads.slice(0, 10).join(", ")}`)
console.log(`  BST max non-lég : ${Math.max(...nonLeg.map(BST))} · BST max légendaire : ${legend.length ? Math.max(...legend.map(BST)) : "—"}`)
