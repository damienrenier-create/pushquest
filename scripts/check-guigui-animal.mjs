// Script : voir où en est GUIGUI dans le parcours d'adoption animal.
//
// Run : node scripts/check-guigui-animal.mjs

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const GRN = "\x1b[32m"
const YEL = "\x1b[33m"
const RED = "\x1b[31m"
const RESET = "\x1b[0m"

async function main() {
    const user = await prisma.user.findUnique({
        where: { nickname: "GUIGUI" },
        select: { id: true },
    })
    if (!user) {
        console.log(`${RED}GUIGUI introuvable${RESET}`)
        await prisma.$disconnect()
        return
    }

    const progress = await prisma.gamebookProgress.findUnique({
        where: { userId_chapterId: { userId: user.id, chapterId: "map_v3" } },
    })
    if (!progress) {
        console.log(`${RED}Pas de GamebookProgress pour GUIGUI${RESET}`)
        await prisma.$disconnect()
        return
    }

    const p = progress
    const tam = p.tamagotchi
    const hasTam = tam && typeof tam === "object"
    const inBag = p.tamagotchiInBag === true

    console.log(`\n${GRN}━━━ Animal de GUIGUI ━━━${RESET}\n`)

    if (!hasTam) {
        console.log(`${YEL}Pas d'animal adopté.${RESET}`)
        console.log(`Pour en adopter un : aller chez V3T (Macaron'île) et déclencher le dialogue.`)
        console.log(`  Map actuelle : ${p.mapId} (${p.posX},${p.posY})`)
        console.log(`  Map V3T : veterinaire`)
        await prisma.$disconnect()
        return
    }

    console.log(`  Nom         : ${tam.name ?? "(vide)"}`)
    console.log(`  Level       : ${tam.currentLevel ?? "?"}`)
    console.log(`  Bonheur     : ${tam.happiness ?? "?"}/100`)
    console.log(`  Récupéré    : ${tam.recovered === true ? GRN + "OUI ✓" + RESET : RED + "NON" + RESET}`)
    console.log(`  Dans le sac : ${inBag ? GRN + "OUI ✓" + RESET : YEL + "NON" + RESET}`)

    // Les 7 défis canoniques
    const CANONICAL_DEFIS = [
        { idx: 0, code: "VISIT", title: "Aller le voir", desc: "Rendre visite à l'animal chez V3T" },
        { idx: 1, code: "DRINK", title: "Lui donner à boire", desc: "Boire ta gourde chez V3T" },
        { idx: 2, code: "PATES", title: "Lui offrir des pâtes", desc: "Manger une Corned Pâtes chez V3T" },
        { idx: 3, code: "DAY_HALVES", title: "Le voir matin ET après-midi", desc: "Visiter V3T avant midi ET après midi" },
        { idx: 4, code: "PLANK_180", title: "180s de gainage", desc: "180s de gainage aujourd'hui" },
        { idx: 5, code: "PUSHUP_200", title: "200 pompes APRÈS gainage", desc: "200 pompes après le gainage" },
        { idx: 6, code: "SQUAT_300", title: "300 squats APRÈS pompes", desc: "300 squats après les pompes" },
    ]

    const defiProgress = tam.defiProgress ?? {}
    console.log(`\n${GRN}━━━ 7 Défis d'adoption ━━━${RESET}\n`)
    let doneCount = 0
    for (const d of CANONICAL_DEFIS) {
        const done = defiProgress[String(d.idx)] === true
        if (done) doneCount++
        const status = done ? GRN + "✅" + RESET : RED + "⬜" + RESET
        console.log(`  ${status} #${d.idx} ${d.title}`)
        console.log(`       ${d.desc}`)
    }

    console.log(`\n${GRN}━━━ Résumé ━━━${RESET}`)
    console.log(`  ${doneCount}/7 défis validés`)
    if (doneCount === 7 && tam.recovered !== true) {
        console.log(`  ${YEL}→ Tu peux LIBÉRER l'animal chez V3T (clique LIBÉRER dans le modal véto).${RESET}`)
    } else if (tam.recovered === true && !inBag) {
        console.log(`  ${YEL}→ L'animal est libéré mais pas dans le sac. Va le récupérer chez V3T.${RESET}`)
    } else if (tam.recovered === true && inBag) {
        console.log(`  ${GRN}→ Tu as ton animal totem. Tout est OK.${RESET}`)
    } else if (doneCount < 7) {
        console.log(`  ${YEL}→ Il te reste ${7 - doneCount} défis à faire.${RESET}`)
    }

    await prisma.$disconnect()
}

main().catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
})
