// LECTURE SEULE — analyse type de Karatame (PSY/COMBAT) pour designer le némésis parfait.
//   npx tsx scripts/_karatame-nemesis.ts
import { POKE_TYPES } from "../src/lib/gamebook/yellow/battle/types"
import { typeEffectiveness, moveCategory } from "../src/lib/gamebook/yellow/battle/typeChart"

const KARATAME: any = ["PSY", "COMBAT"]

console.log("═══ Ce qui FRAPPE Karatame (PSY/COMBAT) — attaquant → multiplicateur ═══")
for (const atk of POKE_TYPES) {
    const eff = typeEffectiveness(atk as any, KARATAME)
    if (eff >= 2) console.log(`  ${String(atk).padEnd(9)} ×${eff}   (${moveCategory(atk as any)})`)
}
console.log("\n═══ Ce que Karatame ENCAISSE bien (≤0.5) ═══")
for (const atk of POKE_TYPES) {
    const eff = typeEffectiveness(atk as any, KARATAME)
    if (eff <= 0.5) console.log(`  ${String(atk).padEnd(9)} ×${eff}`)
}

// Karatame attaque avec PSY (spé, sa vraie arme, spc 130) + COMBAT (phys, atk 49 faible).
const candidates: Record<string, string[]> = {
    "TENEBRES/VOL": ["TENEBRES", "VOL"],
    "TENEBRES/SPECTRE": ["TENEBRES", "SPECTRE"],
    "TENEBRES/FEE": ["TENEBRES", "FEE"],
    "VOL/FEE": ["VOL", "FEE"],
}
console.log("\n═══ Résistance des candidats némésis aux ARMES de Karatame ═══")
for (const [name, types] of Object.entries(candidates)) {
    const vsPsy = typeEffectiveness("PSY" as any, types as any)      // son arme n°1 (spé, spc 130)
    const vsCombat = typeEffectiveness("COMBAT" as any, types as any) // phys, atk 49
    const vsNormal = typeEffectiveness("NORMAL" as any, types as any) // moves normaux early
    const vsElec = typeEffectiveness("ELEC" as any, types as any)     // cage_eclair coverage ?
    console.log(`  ${name.padEnd(18)} : PSY ×${vsPsy}  COMBAT ×${vsCombat}  NORMAL ×${vsNormal}  ELEC ×${vsElec}`)
}
