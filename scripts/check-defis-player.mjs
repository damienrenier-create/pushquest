// Diagnostic des défis V3T d'un joueur précis.
// Run : node scripts/check-defis-player.mjs mools
// (remplace "mools" par le nickname voulu)

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const GRN = "\x1b[32m"
const YEL = "\x1b[33m"
const RED = "\x1b[31m"
const CYAN = "\x1b[36m"
const DIM = "\x1b[2m"
const RESET = "\x1b[0m"

function getTodayISO() {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }))
    return d.toISOString().slice(0, 10)
}

async function main() {
    const nickname = process.argv[2]
    if (!nickname) {
        console.log("Usage: node scripts/check-defis-player.mjs <nickname>")
        await prisma.$disconnect()
        return
    }

    const user = await prisma.user.findFirst({
        where: { nickname },
        select: { id: true, nickname: true, onboardingStartedAt: true },
    })
    if (!user) {
        console.log(`${RED}${nickname} introuvable${RESET}`)
        await prisma.$disconnect()
        return
    }

    const progress = await prisma.gamebookProgress.findUnique({
        where: { userId_chapterId: { userId: user.id, chapterId: "map_v3" } },
    })
    if (!progress) {
        console.log(`${RED}Pas de GamebookProgress${RESET}`)
        await prisma.$disconnect()
        return
    }

    const tam = progress.tamagotchi
    if (!tam || typeof tam !== "object") {
        console.log(`${YEL}Pas d'animal adopté${RESET}`)
        await prisma.$disconnect()
        return
    }

    const today = getTodayISO()
    const sets = await prisma.exerciseSet.findMany({
        where: { userId: user.id, date: today },
        select: { exercise: true, reps: true, createdAt: true },
        orderBy: { createdAt: "asc" },
    })

    console.log(`\n${CYAN}━━━ ${user.nickname} — défis V3T au ${today} ━━━${RESET}\n`)
    console.log(`Animal : ${tam.name ?? "(vide)"} L${tam.currentLevel ?? "?"}`)
    console.log(`Récupéré : ${tam.recovered ? GRN + "OUI" + RESET : RED + "NON" + RESET}`)
    console.log(`lastMorningVisit : ${tam.lastMorningVisitDate ?? "(jamais)"} ${tam.lastMorningVisitDate === today ? GRN + "✓ today" + RESET : ""}`)
    console.log(`lastAfternoonVisit : ${tam.lastAfternoonVisitDate ?? "(jamais)"} ${tam.lastAfternoonVisitDate === today ? GRN + "✓ today" + RESET : ""}`)

    console.log(`\n${CYAN}━━━ ExerciseSet aujourd'hui (ordre chronologique) ━━━${RESET}`)
    if (sets.length === 0) {
        console.log(`${YEL}(aucun set encodé aujourd'hui)${RESET}`)
    } else {
        for (const s of sets) {
            const t = new Date(s.createdAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })
            console.log(`  ${DIM}${t}${RESET}  ${s.exercise.padEnd(7)} ${s.reps}`)
        }
    }

    // Évaluation
    console.log(`\n${CYAN}━━━ Évaluation des défis ━━━${RESET}\n`)

    const defiProgress = tam.defiProgress ?? {}
    const isDone = (i) => defiProgress[String(i)] === true

    // 0 VISIT
    console.log(`#0 VISIT — ${isDone(0) ? GRN + "✅ validé" + RESET : RED + "⬜ pas encore — viens chez V3T avec ton animal" + RESET}`)

    // 1 DRINK
    console.log(`#1 DRINK — ${isDone(1) ? GRN + "✅ validé" + RESET : RED + "⬜ pas encore — bois ta gourde (stored doit baisser sous maxCapacity)" + RESET}`)

    // 2 PATES
    console.log(`#2 PATES — ${isDone(2) ? GRN + "✅ validé" + RESET : RED + "⬜ pas encore — consomme un Corned Pâtes" + RESET}`)

    // 3 DAY_HALVES
    const hasMorning = tam.lastMorningVisitDate === today
    const hasAfternoon = tam.lastAfternoonVisitDate === today
    const hour = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" })).getHours()
    console.log(`#3 DAY_HALVES — ${isDone(3) ? GRN + "✅ validé" + RESET : RED + "⬜ pas encore" + RESET}`)
    console.log(`    matin (avant midi) : ${hasMorning ? GRN + "✓" + RESET : RED + "✗" + RESET}  ·  après-midi (≥ 12h) : ${hasAfternoon ? GRN + "✓" + RESET : RED + "✗" + RESET}`)
    console.log(`    Il est actuellement ${hour}h Paris → tu peux valider ${hour < 12 ? "le matin" : "l'après-midi"} en visitant V3T maintenant.`)

    // 4 PLANK_180
    const plankSets = sets.filter((s) => s.exercise === "PLANK")
    const plankSum = plankSets.reduce((a, s) => a + s.reps, 0)
    console.log(`#4 PLANK_180 — ${isDone(4) ? GRN + "✅ validé" + RESET : ""}`)
    console.log(`    Gainage today : ${plankSum}s (besoin ≥ 180 × ratio)`)

    // 5 PUSHUP_200
    const firstPlankAt = plankSets[0]?.createdAt
    console.log(`#5 PUSHUP_200 (après gainage) — ${isDone(5) ? GRN + "✅ validé" + RESET : ""}`)
    if (!firstPlankAt) {
        console.log(`    ${YEL}Pas encore de gainage today — fais ton 1er set de plank AVANT d'encoder des pompes.${RESET}`)
    } else {
        const pushupsPost = sets.filter((s) => s.exercise === "PUSHUP" && new Date(s.createdAt).getTime() > new Date(firstPlankAt).getTime())
        const pushupsSum = pushupsPost.reduce((a, s) => a + s.reps, 0)
        const pushupsAll = sets.filter((s) => s.exercise === "PUSHUP")
        const pushupsAllSum = pushupsAll.reduce((a, s) => a + s.reps, 0)
        console.log(`    Pompes POST-gainage : ${pushupsSum} / 200 attendu × ratio`)
        if (pushupsAllSum > pushupsSum) {
            console.log(`    ${YEL}⚠ Total pompes today : ${pushupsAllSum} — mais ${pushupsAllSum - pushupsSum} ont été encodées AVANT le 1er gainage et ne comptent pas.${RESET}`)
        }
    }

    // 6 SQUAT_300
    console.log(`#6 SQUAT_300 (après pompes-post-gainage) — ${isDone(6) ? GRN + "✅ validé" + RESET : ""}`)
    if (firstPlankAt) {
        const pushupsPost = sets.filter((s) => s.exercise === "PUSHUP" && new Date(s.createdAt).getTime() > new Date(firstPlankAt).getTime())
        const firstPushupPostPlank = pushupsPost[0]?.createdAt
        if (!firstPushupPostPlank) {
            console.log(`    ${YEL}Pas encore de pompes-post-gainage — fais d'abord plank → pompes, ensuite squats.${RESET}`)
        } else {
            const squatsPost = sets.filter((s) => s.exercise === "SQUAT" && new Date(s.createdAt).getTime() > new Date(firstPushupPostPlank).getTime())
            const squatsSum = squatsPost.reduce((a, s) => a + s.reps, 0)
            const squatsAll = sets.filter((s) => s.exercise === "SQUAT")
            const squatsAllSum = squatsAll.reduce((a, s) => a + s.reps, 0)
            console.log(`    Squats POST-pompes-post-gainage : ${squatsSum} / 300 attendu × ratio`)
            if (squatsAllSum > squatsSum) {
                console.log(`    ${YEL}⚠ Total squats today : ${squatsAllSum} — ${squatsAllSum - squatsSum} ne comptent pas (ordre temporel).${RESET}`)
            }
        }
    }

    console.log(`\n${CYAN}━━━ Note importante ━━━${RESET}`)
    console.log(`Les défis ne sont évalués que quand le joueur PARLE à V3T (route /api/gamebook/tamagotchi/check-defis).`)
    console.log(`Faire des reps chez soi ne met PAS automatiquement à jour defiProgress.`)
    console.log(`Le joueur doit revenir à Macaron'île → vétérinaire → parler à V3T pour que ses reps soient évaluées.`)

    await prisma.$disconnect()
}

main().catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
})
