import { readFileSync } from "node:fs"
const path = "C:/Users/Sartay/AppData/Local/Temp/claude/C--Users-Sartay/14aec05a-7971-4c2c-8840-31905f0ba3a1/tasks/w12h4oi92.output"
const raw = JSON.parse(readFileSync(path, "utf8"))
for (const d of raw.result?.dans ?? []) {
  console.log(`\n${"=".repeat(74)}\n  ${String(d.dan).toUpperCase()}  |  Saiyan ${d.saiyan}  |  shiny: ${d.shiny}`)
  console.log(`  "${String(d.team?.identity ?? "").split(" — ")[0]}"`)
  console.log("-".repeat(74))
  for (const m of d.team?.mons ?? []) {
    console.log(`  ${String(m.name ?? m.speciesId).padEnd(13)} [${m.types}]  ${m.role}`)
    console.log(`     -> ${(m.moves ?? []).join(" . ")}${m.heldItem ? "   {obj: " + String(m.heldItem).split(" (")[0] + "}" : ""}`)
  }
  const v = d.verdict ?? {}
  console.log(`  VERDICT: ${v.verdict}`)
  if (v.legalityIssues?.length) console.log(`   !! LEGALITE: ${v.legalityIssues.join(" | ")}`)
  if (v.categoryIssues?.length) console.log(`   !! CATEGORIE: ${v.categoryIssues.join(" | ")}`)
  if (v.synergyIssues?.length) console.log(`   !! SYNERGIE: ${v.synergyIssues.join(" | ")}`)
}
