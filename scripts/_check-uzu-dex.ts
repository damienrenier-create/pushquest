import { getSpecies, isDexHidden, visibleDexSpecies } from "../src/lib/gamebook/yellow/data/species"
const line = ["otama", "gamaruto", "uzumaro"]
console.log("Lignée Otama — flags + visibilité dex par run (rien capturé) :\n")
for (const id of line) {
    const sp = getSpecies(id)!
    const r3only = (sp as any).runThreeOnly ? "runThreeOnly" : "—"
    // isDexHidden(sp, caught, isChampion, isRun2, isRun3, dexFullUnlock)
    const run1 = isDexHidden(sp, [], false, false, false)
    const run2 = isDexHidden(sp, [], false, true, false)
    const run3 = isDexHidden(sp, [], false, false, true)
    const postR3 = isDexHidden(sp, [], false, false, false, true)
    console.log(`  ${id.padEnd(10)} [${r3only}] → masqué? run1:${run1} · run2:${run2} · run3:${run3} · postR3:${postR3}`)
}
const inRun2 = visibleDexSpecies([], false, true, false).some((s) => s.id === "uzumaro")
console.log(`\nUzumaro dans le CATALOGUE run 2 (non capturé) : ${inRun2 ? "OUI" : "NON"}`)
