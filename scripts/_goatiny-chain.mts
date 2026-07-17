// PUR CALCUL — chaîne 2 stades de Goatiny → mouflon (Sol/Élec, BST final 424). Aucune base.
//   npx tsx scripts/_goatiny-chain.mts
import { buildCustomSpecies } from "../src/lib/gamebook/yellow/create/customSpecies"
import type { CustomSpec } from "../src/lib/gamebook/yellow/create/customSpecies"

const spec = {
    da: "Un chevreau électrique des montagnes", name: "Goatiny", role: "attaquant-spe", curve: "decel", stages: 2, bloomer: "late",
    daFinal: "Un mouflon d'orage aux cornes crépitantes",
    learnset: [
        { level: 5, moveId: "etincelle" }, { level: 5, moveId: "jet_de_sable" }, { level: 12, moveId: "secousse" },
        { level: 18, moveId: "charge" }, { level: 24, moveId: "hurlement" }, { level: 30, moveId: "fulgurance" },
        { level: 36, moveId: "cage_eclair" }, { level: 42, moveId: "tir_boue" }, { level: 48, moveId: "repos" }, { level: 54, moveId: "seisme" },
    ],
    character: "froid, calculateur", attributes: ["cornes", "voix"],
    finalStats: { hp: 100, atk: 52, def: 82, spc: 130, spe: 60 },
    finalTypes: ["SOL", "ELEC"], secretTalent: "affinite_elem", ultimateMove: "ultra_foudre", talentRerolls: 0,
} as unknown as CustomSpec

const chain = buildCustomSpecies(spec, "goatiny")
chain.forEach((s, i) => {
    const bst = Object.values(s.baseStats).reduce((a, b) => a + b, 0)
    const evo = s.evolution ? ` → évolue en ${s.evolution.toId} (${JSON.stringify(s.evolution.method)})` : " (final)"
    console.log(`\n=== STADE ${i + 1} : ${s.name} [${s.types.join("/")}] BST ${bst}${evo}`)
    console.log(`  id=${s.id}  catchRate=${s.catchRate}  growth=${s.growthRate}  role=${s.role}`)
    console.log(`  stats=${JSON.stringify(s.baseStats)}  secretTalent=${s.secretTalent ?? "—"}`)
    console.log(`  learnset=${s.learnset.map((l) => `${l.level}:${l.moveId}`).join(", ")}`)
})
