import { typeEffectiveness, moveCategory } from "../src/lib/gamebook/yellow/battle/typeChart"
import { getSpecies } from "../src/lib/gamebook/yellow/data/species"
const shadow = getSpecies("shadow")!, ombra = getSpecies("ombraroth")!
const S = shadow.types, O = ombra.types
console.log("SHADOW", S, "stats", shadow.baseStats, "| OMBRAROTH", O, "stats", ombra.baseStats)
console.log("\n— Offense de SHADOW sur OMBRAROTH (doit être ~immunisé) —")
for (const t of ["NORMAL","SPECTRE","COMBAT"] as any[]) console.log(`  ${t} → ×${typeEffectiveness(t, O as any)}  (cat ${moveCategory(t)})`)
console.log("\n— Offense d'OMBRAROTH sur SHADOW (Ténèbres doit être ×2, spécial) —")
for (const t of ["TENEBRES","SPECTRE","PSY"] as any[]) console.log(`  ${t} → ×${typeEffectiveness(t, S as any)}  (cat ${moveCategory(t)})`)
console.log(`\n— Vitesse : Ombraroth ${ombra.baseStats.spe} vs Shadow ${shadow.baseStats.spe} → ${ombra.baseStats.spe>shadow.baseStats.spe?"OMBRAROTH plus rapide ✅":"❌ Shadow plus rapide"}`)
console.log(`— Cible du nuke : Ténèbres est SPÉCIAL → frappe la Spé-déf de Shadow = ${shadow.baseStats.spc} (catastrophique ✅)`)
