// dex-pool.mts — corrélation du POOL DE PUISSANCE du créateur vs la moyenne des vraies lignées 3-stades.
//   npx tsx dex-pool.mts
import { SPECIES } from "./src/lib/gamebook/yellow/data/species"
import { getMove } from "./src/lib/gamebook/yellow/data/moves"
import type { SpeciesData, PokeType } from "./src/lib/gamebook/yellow/battle/types"
import { LEARN_LEVELS, moveOptionsFor, suggestLearnset, effectiveMaxPower, powerPoolMod, isDamagingMove } from "./src/lib/gamebook/yellow/create/customSpecies"

const list = Object.values(SPECIES)
const parentOf = new Map<string, string>()
for (const s of list) if (s.evolution?.toId) parentOf.set(s.evolution.toId, s.id)
const depth = (s: SpeciesData) => { let d = 1, c = s.id; while (parentOf.has(c)) { d++; c = parentOf.get(c)! } return d }
const bases = list.filter((s) => !parentOf.has(s.id))
const chainOf = (b: SpeciesData) => { const o = [b]; let c = b; for (let g = 0; g < 4; g++) { const n = c.evolution?.toId ? SPECIES[c.evolution.toId] : undefined; if (!n) break; o.push(n); c = n } return o }
const core3 = bases.map(chainOf).filter((c) => c.length === 3 && !c.some((s) => s.exclusive))
const stat = (xs: number[]) => ({ min: Math.min(...xs), moy: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length), max: Math.max(...xs) })
const fmt = (s: { min: number; moy: number; max: number }) => `min ${s.min} · moy ${s.moy} · max ${s.max}`

// ── DEX : pool de puissance offensive des lignées 3-stades ──
function lineOffPool(c: SpeciesData[]) { // somme des puissances offensives, learnset union dédupliqué
    const seen = new Set<string>(); let sum = 0, n = 0
    for (const s of c) for (const l of s.learnset) { if (seen.has(l.moveId)) continue; seen.add(l.moveId); const m = getMove(l.moveId); if (m && m.power > 0) { sum += m.power; n++ } }
    return { sum, n }
}
const finalOffPool = (c: SpeciesData[]) => { let sum = 0, n = 0; for (const l of c[2].learnset) { const m = getMove(l.moveId); if (m && m.power > 0) { sum += m.power; n++ } } return { sum, n } }

const unionPools = core3.map(lineOffPool)
const finalPools = core3.map(finalOffPool)
const avgOf = (p: { sum: number; n: number }) => p.n ? Math.round(p.sum / p.n) : 0
console.log(`════ DEX (${core3.length} lignées 3-stades) — MOYENNE de puissance PAR ATTAQUE offensive (statuts P0 exclus) ════`)
console.log(`UNION lignée   : puissance MOYENNE/attaque ${fmt(stat(unionPools.map(avgOf)))}  · nb attaques off ${fmt(stat(unionPools.map((p) => p.n)))}  · somme ${fmt(stat(unionPools.map((p) => p.sum)))}`)
console.log(`FORME FINALE   : puissance MOYENNE/attaque ${fmt(stat(finalPools.map(avgOf)))}  · nb attaques off ${fmt(stat(finalPools.map((p) => p.n)))}`)

// ── CRÉATEUR : pool généré par slot. On mesure (a) la suggestion par défaut, (b) le MAX qu'un min-maxer peut prendre. ──
const OFF_SLOTS = LEARN_LEVELS.length - 3 // 3 slots réservés statut → 7 offensifs
function creatorPools(types: PokeType[], bst: number) {
    // (a) suggestion par défaut : moyenne de puissance des attaques OFFENSIVES retenues
    const sug = suggestLearnset(types, bst).map((l) => getMove(l.moveId)!).filter(isDamagingMove)
    const sugAvg = sug.length ? Math.round(sug.reduce((a, m) => a + (m.power > 0 ? m.power : (m.effect?.fixedDamage ?? 0)), 0) / sug.length) : 0
    // (b) MAX : le min-maxer prend la plus forte attaque accessible par palier → on garde les 7 meilleures, moyenne.
    const perSlotMax = LEARN_LEVELS.map((lvl) => {
        const opts = moveOptionsFor(types, lvl, bst).map((id) => getMove(id)!).filter(isDamagingMove)
        return opts.length ? Math.max(...opts.map((m) => m.power > 0 ? m.power : (m.effect?.fixedDamage ?? 0))) : 0
    }).sort((a, b) => b - a).slice(0, OFF_SLOTS)
    const maxAvg = Math.round(perSlotMax.reduce((a, b) => a + b, 0) / OFF_SLOTS)
    return { sugAvg, maxAvg }
}

console.log(`\n════ CRÉATEUR : puissance MOYENNE/attaque offensive selon BST + type (le BST module via powerPoolMod) ════`)
const sampleTypes: PokeType[] = ["NORMAL", "EAU", "FEU", "SOL", "PSY", "COMBAT"]
for (const bst of [335, 435, 480]) {
    console.log(`\n  BST ${bst} (mod NORMAL ${(powerPoolMod(bst, ["NORMAL"]) * 100).toFixed(0)}% · effMaxPower niv54 NORMAL ${effectiveMaxPower(54, bst, ["NORMAL"])}) :`)
    for (const t of sampleTypes) {
        const { sugAvg, maxAvg } = creatorPools([t], bst)
        console.log(`    ${t.padEnd(7)} moy suggérée ${String(sugAvg).padStart(3)} · moy MAX min-maxer ${String(maxAvg).padStart(3)} · mod ${(powerPoolMod(bst, [t]) * 100).toFixed(0)}%`)
    }
}
console.log(`\nRéférence dex à viser (MOYENNE/attaque) : UNION moy ${stat(unionPools.map(avgOf)).moy} · FINALE moy ${stat(finalPools.map(avgOf)).moy}`)
