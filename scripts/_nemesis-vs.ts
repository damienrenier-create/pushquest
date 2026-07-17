// Compare des typages-contre candidats vs une cible. Usage : npx tsx scripts/_nemesis-vs.ts mobyd
import { scoreTyping, profileFromSpecies } from "../src/lib/gamebook/yellow/create/nemesisArchitect"
import type { PokeType } from "../src/lib/gamebook/yellow/battle/types"

const target = process.argv[2] ?? "mobyd"
const p = profileFromSpecies(target)!
const candidates: PokeType[][] = [
    ["EAU", "COMBAT"], ["ELEC", "COMBAT"], ["SPECTRE", "ELEC"], ["SPECTRE", "COMBAT"],
    ["ELEC", "METAL"], ["EAU", "METAL"], ["NORMAL", "ELEC"], ["SOL", "ELEC"],
]
console.log(`\nCible : ${p.name} [${p.types.join("/")}]  (percer en ${p.stats.def <= p.stats.spc ? "PHYSIQUE" : "SPÉCIAL"})\n`)
console.log("  TYPAGE".padEnd(18) + "encaisse  offense              verdict")
for (const c of candidates) {
    const t = scoreTyping(c, p)
    const off = `${t.offenseType} ×${t.offenseMult} ${t.hitsWeakDefense ? "(mur faible)" : "(MUR FORT)"}`
    console.log("  " + c.join("/").padEnd(16) + `×${String(t.resistMult).padEnd(6)} ` + off.padEnd(20) + " " + t.verdict + `  [score ${t.score.toFixed(2)}]`)
}
console.log("")
