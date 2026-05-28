// Affiche l'état d'énergie d'un joueur.
// Run : node scripts/check-player-energy.mjs <nickname>

import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

function getTodayISO() {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }))
    return d.toISOString().slice(0, 10)
}

const nickname = process.argv[2]
if (!nickname) {
    console.log("Usage: node scripts/check-player-energy.mjs <nickname>")
    process.exit(1)
}

const user = await prisma.user.findFirst({
    where: { nickname },
    select: { id: true, nickname: true },
})
if (!user) {
    console.log(`${nickname} introuvable`)
    process.exit(1)
}

const today = getTodayISO()
const progress = await prisma.gamebookProgress.findUnique({
    where: { userId_chapterId: { userId: user.id, chapterId: "map_v3" } },
})

const sets = await prisma.exerciseSet.findMany({
    where: { userId: user.id, date: today },
    select: { exercise: true, reps: true },
})
const todayReps = sets.reduce(
    (sum, s) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps),
    0,
)

const energySpentToday = progress?.energySpentToday ?? 0
const bonusSurplus = progress?.bonusSurplus ?? 0
const energySpentDate = progress?.energySpentDate ?? ""
const currentSpent = energySpentDate === today ? energySpentToday : 0
const available = todayReps - currentSpent + bonusSurplus

console.log(`━━━ ${user.nickname} — ${today} ━━━`)
console.log(`  Position           : ${progress?.mapId} (${progress?.posX}, ${progress?.posY})  ${progress?.mapId === "mont_pasta_ventoux" && progress?.posY === 1 ? "🏔️ SOMMET" : ""}`)
console.log(`  montSummitReached  : ${progress?.montSummitReached ? "✓ OUI" : "✗ NON"}`)
console.log(`  todayReps          : ${todayReps}`)
console.log(`  energySpentToday   : ${currentSpent} ${energySpentDate !== today ? "(reset minuit)" : ""}`)
console.log(`  bonusSurplus       : ${bonusSurplus}`)
console.log(`  → availableEnergy  : ${available}`)
console.log(``)
console.log(`Énergie consommée aujourd'hui (énergie générée − dispo) :`)
console.log(`  (todayReps + boost surplus accumulés) − dispo restante`)
console.log(`  = ${todayReps + bonusSurplus + currentSpent} − ${available} = ${currentSpent} reps spent (sans bonus consommé) / ${currentSpent + (bonusSurplus < 0 ? 0 : 0)} reps total`)
console.log(`  Note : energySpentToday représente uniquement la dépense quand bonusSurplus était à 0.`)
console.log(`  Pour la dépense réelle totale, il faudrait connaître bonusSurplus initial avant montée — pas tracké.`)

await prisma.$disconnect()
