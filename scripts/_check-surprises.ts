import { SPECIES, visibleDexSpecies } from "../src/lib/gamebook/yellow/data/species"
const surprises = Object.values(SPECIES).filter((s) => (s as any).hiddenUntilCaught)
console.log(`hiddenUntilCaught : ${surprises.length} espèces`)
const vis1 = new Set(visibleDexSpecies([], false, false, false).map((s) => s.id))          // run 1, rien capturé
const visFull = new Set(visibleDexSpecies([], false, false, false, true).map((s) => s.id))  // post-run 3 (full unlock)
for (const s of surprises) {
    const flags = [(s as any).runThreeOnly && "run3", (s as any).runTwoOnly && "run2", (s as any).postLeague && "postLeague"].filter(Boolean).join(",") || "aucun"
    console.log(`  ${s.id.padEnd(16)} [${s.types.join("/")}] flags:${flags.padEnd(12)} · visible run1:${vis1.has(s.id)} · visible postR3:${visFull.has(s.id)}`)
}
