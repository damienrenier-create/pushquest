// dex-rules.mts — données pour BALISER le créateur : rareté des attaques, utilité des types, statuts.
//   npx tsx dex-rules.mts
import { SPECIES } from "./src/lib/gamebook/yellow/data/species"
import { MOVES, getMove } from "./src/lib/gamebook/yellow/data/moves"
import { typeEffectiveness, moveCategory } from "./src/lib/gamebook/yellow/battle/typeChart"
import { POKE_TYPES, type PokeType } from "./src/lib/gamebook/yellow/battle/types"

const list = Object.values(SPECIES)

// ── 1) RARETÉ : combien d'ESPÈCES apprennent chaque attaque (learnset) ? ──
const learnCount = new Map<string, number>()
for (const s of list) { const seen = new Set<string>(); for (const l of s.learnset) if (!seen.has(l.moveId)) { seen.add(l.moveId); learnCount.set(l.moveId, (learnCount.get(l.moveId) ?? 0) + 1) } }
const damaging = Object.values(MOVES).filter((m) => m.power > 0)
const inLearnset = damaging.filter((m) => (learnCount.get(m.id) ?? 0) > 0)
const ctOnly = damaging.filter((m) => (learnCount.get(m.id) ?? 0) === 0)

console.log(`════════ RARETÉ DES ATTAQUES (nb d'espèces qui l'apprennent en learnset) ════════`)
console.log(`Attaques offensives : ${damaging.length} · dont ${inLearnset.length} dans ≥1 learnset · ${ctOnly.length} JAMAIS apprises (CT-only)`)
console.log(`CT-only (à NE JAMAIS proposer en learnset) : ${ctOnly.map((m) => m.name).join(", ")}`)
const counts = inLearnset.map((m) => learnCount.get(m.id) ?? 0).sort((a, b) => a - b)
const q = (p: number) => counts[Math.floor(counts.length * p)]
console.log(`Distribution du nb d'espèces/attaque : min ${counts[0]} · p25 ${q(0.25)} · médiane ${q(0.5)} · p75 ${q(0.75)} · max ${counts[counts.length - 1]}`)
// Tiers proposés
const tier = (n: number) => n >= 8 ? "commune" : n >= 4 ? "répandue" : n >= 2 ? "rare" : "exceptionnelle"
const byTier: Record<string, string[]> = { commune: [], répandue: [], rare: [], exceptionnelle: [] }
for (const m of inLearnset) byTier[tier(learnCount.get(m.id) ?? 0)].push(`${m.name}(${learnCount.get(m.id)}×,P${m.power})`)
for (const t of ["commune", "répandue", "rare", "exceptionnelle"]) console.log(`  ${t} (${byTier[t].length}) : ${byTier[t].slice(0, 12).join(", ")}${byTier[t].length > 12 ? "…" : ""}`)

// ── 2) UTILITÉ OFFENSIVE DE CHAQUE TYPE (couverture super-efficace sur le dex) ──
console.log(`\n════════ UTILITÉ OFFENSIVE PAR TYPE (× d'espèces frappées ≥×2) ════════`)
const rows = POKE_TYPES.map((t) => {
    let se = 0, immune = 0
    for (const s of list) { const e = typeEffectiveness(t, s.types); if (e >= 2) se++; if (e === 0) immune++ }
    return { t, sePct: Math.round((se / list.length) * 100), immune, cat: moveCategory(t) }
}).sort((a, b) => b.sePct - a.sePct)
for (const r of rows) console.log(`  ${r.t.padEnd(8)} ${r.cat === "PHYSICAL" ? "phys" : "spé "} · super-eff sur ${String(r.sePct).padStart(2)}% du dex · immunise ${r.immune}`)

// ── 3) STATUTS : catégorisation ──
console.log(`\n════════ ATTAQUES DE STATUT (P0) — catégories ════════`)
const status = Object.values(MOVES).filter((m) => m.power <= 0)
const cat = { inflige: [] as string[], debuffAdv: [] as string[], buffSoi: [] as string[], soin: [] as string[], autre: [] as string[] }
for (const m of status) {
    const e = m.effect
    if (e?.inflictStatus) cat.inflige.push(`${m.name}(${e.inflictStatus})`)
    else if (e?.healPct || e?.restSleep) cat.soin.push(m.name)
    else if (e?.statChanges?.some((c) => c.target === "target" && c.stages < 0)) cat.debuffAdv.push(`${m.name}(${e.statChanges.map((c) => `${c.stat}${c.stages}`).join(",")})`)
    else if (e?.statChanges?.some((c) => c.target === "self" && c.stages > 0)) cat.buffSoi.push(`${m.name}(${e.statChanges.map((c) => `${c.stat}+${c.stages}`).join(",")})`)
    else cat.autre.push(m.name)
}
console.log(`  Inflige un statut (${cat.inflige.length}) : ${cat.inflige.join(", ")}`)
console.log(`  Débuff ADVERSAIRE (${cat.debuffAdv.length}) : ${cat.debuffAdv.join(", ")}`)
console.log(`  Buff SOI (${cat.buffSoi.length}) : ${cat.buffSoi.join(", ")}`)
console.log(`  Soin (${cat.soin.length}) : ${cat.soin.join(", ")}`)
console.log(`  Autre (${cat.autre.length}) : ${cat.autre.join(", ")}`)
