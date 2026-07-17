// dex-analysis.mts — ANALYSE STATISTIQUE du dex (lit species.ts + moves.ts). 100% données réelles.
//   npx tsx dex-analysis.mts
import { SPECIES } from "./src/lib/gamebook/yellow/data/species"
import { getMove } from "./src/lib/gamebook/yellow/data/moves"
import { moveCategory } from "./src/lib/gamebook/yellow/battle/typeChart"
import type { SpeciesData, StatKey, PokeType } from "./src/lib/gamebook/yellow/battle/types"

const KEYS: StatKey[] = ["hp", "atk", "def", "spe", "spc"]
const BST = (s: SpeciesData) => KEYS.reduce((a, k) => a + s.baseStats[k], 0)
const list = Object.values(SPECIES)

// ── Chaînes d'évolution ──
const parentOf = new Map<string, string>()
for (const s of list) if (s.evolution?.toId) parentOf.set(s.evolution.toId, s.id)
const bases = list.filter((s) => !parentOf.has(s.id))
function chain(base: SpeciesData): SpeciesData[] {
    const out = [base]; let cur = base
    for (let g = 0; g < 5; g++) { const n = cur.evolution?.toId ? SPECIES[cur.evolution.toId] : undefined; if (!n) break; out.push(n); cur = n }
    return out
}
const chains = bases.map(chain)
const core3 = chains.filter((c) => c.length === 3 && !c.some((s) => s.exclusive))
const core2 = chains.filter((c) => c.length === 2 && !c.some((s) => s.exclusive))
const core1 = chains.filter((c) => c.length === 1 && !c[0].exclusive)
const stat = (xs: number[]) => xs.length ? { min: Math.min(...xs), moy: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length), max: Math.max(...xs) } : { min: 0, moy: 0, max: 0 }
const fmt = (s: { min: number; moy: number; max: number }) => `min ${s.min} · moy ${s.moy} · max ${s.max}`

console.log(`\n════════ 1) LIGNÉES ════════`)
console.log(`Total espèces : ${list.length} (dont exclusives : ${list.filter((s) => s.exclusive).length})`)
console.log(`Chaînes : ${core1.length} mono-stade · ${core2.length} à 2 stades · ${core3.length} à 3 stades (hors exclusives)`)

console.log(`\n════════ 2) BST PAR STADE ════════`)
console.log(`3 stades — base : ${fmt(stat(core3.map((c) => BST(c[0]))))}`)
console.log(`3 stades — inter: ${fmt(stat(core3.map((c) => BST(c[1]))))}`)
console.log(`3 stades — FINAL: ${fmt(stat(core3.map((c) => BST(c[2]))))}`)
console.log(`   ratio base/final moyen : ${(core3.reduce((a, c) => a + BST(c[0]) / BST(c[2]), 0) / core3.length).toFixed(2)} · inter/final : ${(core3.reduce((a, c) => a + BST(c[1]) / BST(c[2]), 0) / core3.length).toFixed(2)}`)
console.log(`2 stades — base : ${fmt(stat(core2.map((c) => BST(c[0]))))} · FINAL : ${fmt(stat(core2.map((c) => BST(c[1]))))}`)
console.log(`1 stade  — BST  : ${fmt(stat(core1.map((c) => BST(c[0]))))}`)
console.log(`Exclusives BST : ${fmt(stat(list.filter((s) => s.exclusive).map(BST)))} (${list.filter((s) => s.exclusive).map((s) => `${s.name}=${BST(s)}`).join(", ")})`)

// ── Learnset : union des events de la lignée (level, moveId) dédupliqués ──
function lineLearn(c: SpeciesData[]): Array<{ level: number; moveId: string }> {
    const seen = new Set<string>(); const out: Array<{ level: number; moveId: string }> = []
    for (const s of c) for (const l of s.learnset) { const k = `${l.level}:${l.moveId}`; if (!seen.has(k)) { seen.add(k); out.push(l) } }
    return out.sort((a, b) => a.level - b.level)
}
const learnCounts = core3.map((c) => lineLearn(c).length)
const finalLearnCounts = core3.map((c) => c[2].learnset.length)
const distinctMoves = core3.map((c) => new Set(lineLearn(c).map((l) => l.moveId)).size)

console.log(`\n════════ 3) LEARNSET (lignées 3 stades) ════════`)
console.log(`Events d'apprentissage / lignée (union 3 stades) : ${fmt(stat(learnCounts))}`)
console.log(`Attaques DISTINCTES / lignée : ${fmt(stat(distinctMoves))}`)
console.log(`Taille du learnset du STADE FINAL seul : ${fmt(stat(finalLearnCounts))}`)
const allLevels = core3.flatMap((c) => lineLearn(c).map((l) => l.level))
const lvlHist: Record<number, number> = {}; for (const l of allLevels) lvlHist[l] = (lvlHist[l] ?? 0) + 1
console.log(`Niveaux d'apprentissage utilisés (level: nb d'events) :`)
console.log("  " + Object.keys(lvlHist).map(Number).sort((a, b) => a - b).map((l) => `${l}:${lvlHist[l]}`).join("  "))

// ── Puissance par niveau (LE cœur pour les caps) ──
// NB : le niveau 1 = KIT INNÉ (moves connus/hérités à l'évolution, y compris ceux des finales). Ce n'est PAS
// « appris en montant de niveau ». On sépare donc : (A) kit de départ des BASES · (B) progression (niveau >1).
console.log(`\n════════ 4) PUISSANCE ↔ NIVEAU ════════`)
const allEvents = core3.flatMap((c) => lineLearn(c).map((l) => ({ level: l.level, mv: getMove(l.moveId) })).filter((e) => e.mv))
const events = allEvents.filter((e) => e.level > 1) // PROGRESSION uniquement (hors kit inné N1)
const buckets: Array<[string, (p: number) => boolean]> = [
    ["statut (P0)", (p) => p === 0], ["P 1-40", (p) => p > 0 && p <= 40], ["P 41-60", (p) => p > 40 && p <= 60],
    ["P 61-80", (p) => p > 60 && p <= 80], ["P 81-100", (p) => p > 80 && p <= 100], ["P 101+", (p) => p > 100],
]
// (A) KIT DE DÉPART des BASES (moves niveau 1 des espèces de 1er stade)
const baseKit = core3.flatMap((c) => c[0].learnset.filter((l) => l.level === 1).map((l) => getMove(l.moveId)).filter(Boolean))
const baseKitDmg = baseKit.filter((m) => m!.power > 0).map((m) => m!.power)
console.log(`(A) KIT DE DÉPART des BASES (niv 1) : ${baseKit.length} moves · dont ${baseKitDmg.length} offensifs · puissance offensive ${fmt(stat(baseKitDmg))}`)
console.log(`(B) PROGRESSION (learns niveau >1). À quels niveaux chaque tranche de puissance est apprise :`)
for (const [label, test] of buckets) {
    const lv = events.filter((e) => test(e.mv!.power)).map((e) => e.level)
    if (lv.length) console.log(`  ${label.padEnd(12)} : ${lv.length} events · niveaux ${fmt(stat(lv))}  ← 1re apparition au niv ${Math.min(...lv)}`)
}
console.log(`Puissance MAX apprise en PROGRESSION à/avant le niveau (hors kit inné) :`)
for (const L of [9, 15, 20, 27, 30, 36, 45, 54]) {
    const powers = events.filter((e) => e.level <= L && e.mv!.power > 0).map((e) => e.mv!.power)
    const p90 = powers.length ? [...powers].sort((a, b) => a - b)[Math.floor(powers.length * 0.9)] : 0
    console.log(`  niv ≤${String(L).padStart(2)} : max ${powers.length ? Math.max(...powers) : 0} · p90 ${p90}`)
}

// ── STAB (relatif au stade final) ──
console.log(`\n════════ 5) STAB (attaques offensives du type du Daemon final) ════════`)
const stabInnate: number[] = []; const stabProg: number[] = []; const stabPerLine: number[] = []; const firstStab: number[] = []
for (const c of core3) {
    const ft = c[2].types
    const stabs = lineLearn(c).filter((l) => { const m = getMove(l.moveId); return m && m.power > 0 && ft.includes(m.type) })
    stabPerLine.push(stabs.length)
    for (const s of stabs) (s.level === 1 ? stabInnate : stabProg).push(s.level)
    const prog = stabs.filter((s) => s.level > 1).map((s) => s.level); if (prog.length) firstStab.push(Math.min(...prog))
}
console.log(`Attaques STAB offensives / lignée : ${fmt(stat(stabPerLine))}`)
console.log(`STAB au KIT INNÉ (niv 1) : ${stabInnate.length} · STAB en PROGRESSION (niv >1) : ${stabProg.length}`)
console.log(`Niveau du 1er STAB de PROGRESSION par lignée : ${fmt(stat(firstStab))} · niveaux des STAB de progression : ${fmt(stat(stabProg))}`)

// ── Ratio dégâts / statut ──
console.log(`\n════════ 6) RATIO ATTAQUES OFFENSIVES / STATUT ════════`)
function ratio(evs: Array<{ mv: ReturnType<typeof getMove> }>) {
    const dmg = evs.filter((e) => (e.mv?.power ?? 0) > 0).length; const st = evs.length - dmg
    return { dmg, st, pctStatut: evs.length ? Math.round((st / evs.length) * 100) : 0 }
}
const glob = ratio(events)
console.log(`Global (lignées 3 stades) : ${glob.dmg} offensives · ${glob.st} statut → ${glob.pctStatut}% de statut`)
const perLinePctStatut = core3.map((c) => { const evs = lineLearn(c).map((l) => ({ mv: getMove(l.moveId) })); return ratio(evs).pctStatut })
console.log(`% statut par lignée : ${fmt(stat(perLinePctStatut))}`)

// ── Puissance totale du pool ──
console.log(`\n════════ 7) PUISSANCE TOTALE DU POOL D'ATTAQUES / LIGNÉE ════════`)
const poolPower = core3.map((c) => lineLearn(c).reduce((a, l) => a + (getMove(l.moveId)?.power ?? 0), 0))
console.log(`Somme des puissances (union learnset 3 stades) : ${fmt(stat(poolPower))}`)

// ── Par rôle ──
console.log(`\n════════ 8) PAR RÔLE (mot-clé du champ role du stade FINAL) ════════`)
const roleKeys = ["sweeper", "mur", "tank", "défensif", "mixte", "rapide", "soigneur", "physique", "spécial"]
for (const rk of roleKeys) {
    const lines = core3.filter((c) => (c[2].role ?? "").toLowerCase().includes(rk))
    if (lines.length < 2) continue
    const bst = stat(lines.map((c) => BST(c[2])))
    const pct = stat(lines.map((c) => { const evs = lineLearn(c).map((l) => ({ mv: getMove(l.moveId) })); return ratio(evs).pctStatut }))
    const learn = stat(lines.map((c) => lineLearn(c).length))
    console.log(`  « ${rk} » (${lines.length} lignées) : BST final ${fmt(bst)} · %statut ${fmt(pct)} · events ${fmt(learn)}`)
}

console.log(`\n════════ 9) EXEMPLES (3 lignées 3-stades, learnset final complet) ════════`)
for (const c of core3.slice(0, 3)) {
    console.log(`  ${c.map((s) => `${s.name}(${BST(s)})`).join(" → ")} [${c[2].types.join("/")}]`)
    console.log("    final: " + c[2].learnset.map((l) => { const m = getMove(l.moveId); return `N${l.level} ${m?.name}(${m?.power ? "P" + m.power + (c[2].types.includes(m.type) ? "★" : "") : "stat"})` }).join(" · "))
}
