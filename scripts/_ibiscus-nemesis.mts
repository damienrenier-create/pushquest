// PUR CALCUL — dérive la NÉMÉSIS d'Ibiscus (buildNemesis) + sa chaîne 3 stades. Aucune base.
//   npx tsx scripts/_ibiscus-nemesis.mts
import { buildCustomSpecies, buildNemesis } from "../src/lib/gamebook/yellow/create/customSpecies"
import type { CustomSpec } from "../src/lib/gamebook/yellow/create/customSpecies"

const ibiscus = {
    da: "Un crocodile étrange", name: "Ibiscus", role: "rapide", curve: "decel", stages: 3, bloomer: "late",
    daFinal: "Un caméléon de pierre avec des ailes",
    learnset: [
        { level: 5, moveId: "picpic" }, { level: 5, moveId: "jet_de_sable" }, { level: 12, moveId: "jet_pierres" },
        { level: 18, moveId: "malediction" }, { level: 24, moveId: "vive_attaque" }, { level: 30, moveId: "hurlement" },
        { level: 36, moveId: "mur_de_fer" }, { level: 42, moveId: "lame_roche" }, { level: 48, moveId: "berceuse" }, { level: 54, moveId: "vol" },
    ],
    character: "Tres intelligent", attributes: ["ailes", "voix"],
    finalStats: { hp: 70, atk: 135, def: 75, spc: 45, spe: 130 },
    finalTypes: ["VOL", "ROCHE"], secretTalent: "affinite_elem", ultimateMove: "meteores", talentRerolls: 0,
} as unknown as CustomSpec

const nemSpec = buildNemesis(ibiscus)
console.log("=== SPEC NÉMÉSIS ===")
console.log(JSON.stringify({ name: nemSpec.name, da: nemSpec.da, character: nemSpec.character, role: nemSpec.role, finalTypes: nemSpec.finalTypes, finalStats: nemSpec.finalStats, bloomer: nemSpec.bloomer }, null, 2))

const chain = buildCustomSpecies(nemSpec, "mools_nem")
chain.forEach((s, i) => {
    const bst = Object.values(s.baseStats).reduce((a, b) => a + b, 0)
    const evo = s.evolution ? ` → ${s.evolution.toId} (${JSON.stringify(s.evolution.method)})` : " (final)"
    console.log(`\n=== STADE ${i + 1} : ${s.name} [${s.types.join("/")}] BST ${bst}${evo}`)
    console.log(`  stats=${JSON.stringify(s.baseStats)}`)
    console.log(`  learnset=${s.learnset.map((l) => `${l.level}:${l.moveId}`).join(", ")}`)
})
