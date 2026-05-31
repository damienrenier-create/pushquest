// Diagnostic Muscuville : flags de passage des rochers + position joueur.
// Run : node scripts/check-muscuville.mjs <nickname>
// Utilise $queryRaw pour by-passer un client Prisma local potentiellement stale.

import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const nickname = process.argv[2]
if (!nickname) {
    console.log("Usage: node scripts/check-muscuville.mjs <nickname>")
    process.exit(1)
}

const users = await prisma.$queryRawUnsafe(
    `SELECT id, nickname FROM "User" WHERE nickname = $1 LIMIT 1`,
    nickname,
)
if (!users || users.length === 0) {
    console.log(`${nickname} introuvable`)
    process.exit(1)
}
const user = users[0]

const rows = await prisma.$queryRawUnsafe(
    `SELECT "mapId", "posX", "posY", "direction",
            "muscuvilleRocksPassed",
            "muscuvilleChampionsBeaten",
            "muscuvilleInterpellatorTalked",
            "arenaUnlocked",
            "contestDefiPompatorDone",
            "contestDefiSquatilusDone",
            "contestDefiTiroirDone"
       FROM "GamebookProgress"
      WHERE "userId" = $1 AND "chapterId" = 'map_v3' LIMIT 1`,
    user.id,
)

if (!rows || rows.length === 0) {
    console.log(`${user.nickname} : pas de progression map_v3`)
    process.exit(1)
}
const p = rows[0]

const champions = Array.isArray(p.muscuvilleChampionsBeaten)
    ? p.muscuvilleChampionsBeaten
    : []

console.log(`━━━ ${user.nickname} — Muscuville ━━━`)
console.log(`  Position courante       : ${p.mapId} (${p.posX}, ${p.posY}) ${p.direction}`)
console.log(``)
console.log(`  🪨 muscuvilleRocksPassed : ${p.muscuvilleRocksPassed ? "✓ TRUE (passage débloqué)" : "✗ FALSE (encore bloqué)"}`)
console.log(`  Champions battus         : ${champions.length}/4 [${champions.join(", ")}]`)
console.log(`  Interpellator parlé      : ${p.muscuvilleInterpellatorTalked ? "✓" : "✗"}`)
console.log(`  Arène débloquée          : ${p.arenaUnlocked ? "✓" : "✗"}`)
console.log(``)
console.log(`  Défis Macaron'île :`)
console.log(`    Pompator               : ${p.contestDefiPompatorDone ? "✓" : "✗"}`)
console.log(`    Squatilus              : ${p.contestDefiSquatilusDone ? "✓" : "✗"}`)
console.log(`    Tiroir                 : ${p.contestDefiTiroirDone ? "✓" : "✗"}`)
console.log(``)

if (p.muscuvilleRocksPassed) {
    console.log(`  → Rochers cassés en BDD. Si bloqué quand même, causes possibles :`)
    console.log(`     - Cache navigateur : refresh Ctrl+Shift+R`)
    console.log(`     - Frontend muscuvilleRocksPassed à FALSE (state stale) → vérifier /api/gamebook/state response`)
    console.log(`     - Position actuelle bloquée par autre chose qu'un boulder`)
} else {
    console.log(`  → Rochers PAS cassés en BDD. Le user doit payer via le PNJ ou /api/gamebook/muscuville/rocks-pay`)
    console.log(`     Prix actuel : ${4000 * Math.max(0, 1 - champions.length / 4)} reps (${champions.length}/4 champions)`)
}

await prisma.$disconnect()
