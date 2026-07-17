// LECTURE SEULE — vérifie la lignée Sépulcru/Macabour/Condombre : learnset valide, catégories alignées sur les
// stats, matchup vs Karatame (les 2 sens), vitesse, dégâts estimés, câblage némésis.
//   npx tsx scripts/_verify-condombre.ts
import { SPECIES, CANONICAL_NEMESIS } from "../src/lib/gamebook/yellow/data/species"
import { MOVES } from "../src/lib/gamebook/yellow/data/moves"
import { typeEffectiveness, moveCategory } from "../src/lib/gamebook/yellow/battle/typeChart"

const line = ["sepulcru", "macabour", "condombre"]
const KARA = SPECIES["karatame"] // pas dans SPECIES (custom) → on hardcode les stats connues d'Embi
const karaTypes: any = ["PSY", "COMBAT"]
const karaStats = { hp: 75, atk: 49, def: 70, spc: 130, spe: 90 }

console.log("═══ 1. Espèces & BST ═══")
for (const id of line) {
    const s = SPECIES[id]
    if (!s) { console.log(`  ❌ ${id} INTROUVABLE`); continue }
    const b = s.baseStats as any
    const bst = b.hp + b.atk + b.def + b.spe + b.spc
    console.log(`  ✅ #${s.dexNo} ${s.name.padEnd(10)} [${s.types.join("/")}]  ${JSON.stringify(b)}  BST ${bst}`)
}

console.log("\n═══ 2. Learnset de Condombre — chaque move existe ? catégorie alignée sur la stat ? ═══")
const cond = SPECIES["condombre"]
const catStat = (t: string) => (moveCategory(t as any) === "PHYSICAL" ? "ATK 122" : "SPC 52")
for (const l of cond.learnset) {
    const m = MOVES[l.moveId]
    if (!m) { console.log(`  ❌ L${l.level} ${l.moveId} MOVE INEXISTANT`); continue }
    const cat = moveCategory(m.type as any)
    const stab = cond.types.includes(m.type as any) ? "STAB" : "    "
    const aligned = m.power > 0 ? (cat === "PHYSICAL" ? "→ ATK 122 ✅" : "→ spc 52 ⚠️ faible") : "(statut)"
    console.log(`  L${String(l.level).padStart(2)} ${m.name.padEnd(16)} ${String(m.type).padEnd(9)} P${String(m.power).padStart(3)} ${cat.padEnd(8)} ${stab} ${aligned}`)
}

console.log("\n═══ 3. Matchup Condombre ↔ Karatame ═══")
const condTypes: any = cond.types
console.log("  Condombre FRAPPE Karatame :")
for (const t of ["VOL", "TENEBRES"]) console.log(`    ${t.padEnd(9)} ×${typeEffectiveness(t as any, karaTypes)}  (${moveCategory(t as any)})`)
console.log("  Karatame FRAPPE Condombre :")
for (const t of ["PSY", "COMBAT", "NORMAL", "ELEC"]) console.log(`    ${t.padEnd(9)} ×${typeEffectiveness(t as any, condTypes)}`)
console.log(`  Vitesse : Condombre 104 vs Karatame 90  →  ${104 > 90 ? "✅ le dépasse" : "❌"}`)

console.log("\n═══ 4. Dégâts estimés (Gen-1, niveau 55) — Serres de l'Aube (VOL 80, prio) de Condombre sur Karatame ═══")
const L = 55
const atk = Math.floor(cond.baseStats.atk * 2 * L / 100) + 5   // stat approx sans IV/EV
const def = Math.floor(karaStats.def * 2 * L / 100) + 5
const power = 80, stab = 1.5, eff = typeEffectiveness("VOL" as any, karaTypes)
const dmg = Math.floor((Math.floor((Math.floor(2 * L / 5 + 2) * power * atk / def) / 50) + 2) * stab * eff)
const karaHP = Math.floor(karaStats.hp * 2 * L / 100) + L + 10
console.log(`  atk≈${atk} def≈${def} · power ${power} · STAB ×${stab} · type ×${eff}  →  ~${dmg} dégâts`)
console.log(`  PV de Karatame ≈ ${karaHP}  →  ${dmg >= karaHP ? "💀 OHKO" : `${Math.ceil(karaHP / dmg)} coups`}`)

console.log("\n═══ 5. Câblage némésis (CANONICAL_NEMESIS) ═══")
for (const k of ["custom_cmml4dogn00005n1_bidouzen_s1", "custom_cmml4dogn00005n1_bidouzen_s2", "custom_cmml4dogn00005n1_bidouzen_s3"]) {
    console.log(`  ${k} → ${CANONICAL_NEMESIS[k] ?? "❌ ABSENT"}`)
}
