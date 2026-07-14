// PROTOCOLE NÉMÉSIS — outil dev. Donne un Daemon (id d'espèce du pool, OU stats/types à la main) et sors le
// contre optimal : typages classés (prouvés sur la table), stats + learnset proposés, et les contres EXISTANTS
// du pool. Usage : npx tsx scripts/_nemesis-architect.ts mobyd    (ou : guizer, razmaree, uzumaro, …)
import { architectNemesis, profileFromSpecies, type DaemonProfile } from "../src/lib/gamebook/yellow/create/nemesisArchitect"

const arg = process.argv[2] ?? "mobyd"
const p: DaemonProfile | null = profileFromSpecies(arg)
if (!p) { console.log(`Espèce "${arg}" introuvable. Ex : mobyd, guizer, razmaree, uzumaro, regnantaur…`); process.exit(0) }

const plan = architectNemesis(p)
const S = p.stats
console.log(`\n${"═".repeat(78)}\n  PROTOCOLE NÉMÉSIS — cible : ${p.name} [${p.types.join("/")}]`)
console.log(`  Stats : PV ${S.hp} · ATQ ${S.atk} · DÉF ${S.def} · VIT ${S.spe} · SPÉ ${S.spc}\n${"═".repeat(78)}`)

console.log(`\n▸ PROFIL`)
console.log(`  STAB réels (menace) : ${plan.liveStabs.map((s) => `${s.type}[${s.category === "PHYSICAL" ? "phys" : "spé"} ${s.threat}]`).join(", ")}`)
console.log(`  Mur défensif faible : ${plan.weakDefense === "PHYSICAL" ? `DÉF ${S.def} (< SPÉ ${S.spc}) → PERCER EN PHYSIQUE` : `SPÉ ${S.spc} (< DÉF ${S.def}) → PERCER EN SPÉCIAL`}`)

console.log(`\n▸ MEILLEURS TYPAGES-CONTRE (prouvés sur la table)`)
for (const t of plan.topTypings) {
    const off = `${t.offenseType} ×${t.offenseMult}${t.hitsWeakDefense ? " ✓mur-faible" : " ✗mur-fort"}`
    console.log(`  ${String(t.types.join("/")).padEnd(16)} encaisse ×${t.resistMult} · frappe ${off.padEnd(26)} · ${t.verdict}`)
}

console.log(`\n▸ CONTRES DÉJÀ DANS LE POOL`)
if (plan.poolCounters.length === 0) console.log(`  (aucun — il faut créer un bespoke)`)
for (const c of plan.poolCounters) {
    const fl = c.flags.length ? ` {${c.flags.join(",")}}` : ""
    console.log(`  ${c.name.padEnd(14)} [${c.types.join("/")}] BST ${c.bst} · encaisse ×${c.resistMult} · ${c.offenseType} ×${c.offenseMult}${c.usableOffense ? "" : " (stat off. faible)"}${c.fasterThanPlayer ? " · + rapide" : ""}${fl}`)
}

console.log(`\n▸ BESPOKE PROPOSÉ (2e choix)`)
const ch = plan.chosen
console.log(`  Types    : ${ch.types.join("/")}`)
console.log(`  Stats    : PV ${ch.stats.hp} · ATQ ${ch.stats.atk} · DÉF ${ch.stats.def} · VIT ${ch.stats.spe} · SPÉ ${ch.stats.spc}  (BST ${Object.values(ch.stats).reduce((a, b) => a + b, 0)})`)
console.log(`  Learnset : ${ch.learnset.map((l) => `${l.level}:${l.moveId}`).join("  ")}`)

console.log(`\n▸ RECOMMANDATION\n  ${plan.recommendation}\n`)
