import { readFileSync } from "node:fs"
const path = "C:/Users/Sartay/AppData/Local/Temp/claude/C--Users-Sartay/14aec05a-7971-4c2c-8840-31905f0ba3a1/tasks/wneemmi27.output"
const raw = JSON.parse(readFileSync(path, "utf8"))
const r = raw.result ?? {}
console.log(`TOTAL DAEMONS DISTINCTS : ${r.totalDistinct}\n`)
for (const d of r.teams ?? []) {
  const t = d.team ?? {}
  console.log(`${"=".repeat(76)}\n  ${d.archetype}`)
  console.log("-".repeat(76))
  for (const m of t.mons ?? []) {
    console.log(`  ${String(m.name ?? m.speciesId).padEnd(14)} [${m.types}]  ${String(m.role).slice(0,58)}`)
    console.log(`     -> ${(m.moves ?? []).join(" . ")}${m.heldItem ? "  {" + String(m.heldItem).split(" (")[0] + "}" : ""}`)
  }
}
console.log(`\n${"#".repeat(76)}\n  AUDIT GLOBAL\n${"#".repeat(76)}`)
console.log(typeof r.audit === "string" ? r.audit : JSON.stringify(r.audit))
