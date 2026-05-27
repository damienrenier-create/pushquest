// Vérifie l'état du compte GUIGUI en DB.
// À lancer : node scripts/check-guigui-status.mjs
//
// Affiche : isSystem, isTester, existence du GamebookProgress, dernier login.
// Aucune écriture.

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const GRN = "\x1b[32m"
const YEL = "\x1b[33m"
const RED = "\x1b[31m"
const RESET = "\x1b[0m"

async function main() {
    const user = await prisma.user.findUnique({
        where: { nickname: "GUIGUI" },
        select: {
            id: true,
            nickname: true,
            email: true,
            isSystem: true,
            isTester: true,
            createdAt: true,
            updatedAt: true,
        },
    })

    if (!user) {
        console.log(`${RED}[KO]${RESET} Compte GUIGUI introuvable.`)
        console.log(`     Exécute : node --import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("tsx/esm", pathToFileURL("./"))' scripts/init-guigui.ts`)
        console.log(`     Ou plus simple : npx tsx scripts/init-guigui.ts`)
        await prisma.$disconnect()
        return
    }

    console.log(`\n${GRN}━━━ Compte GUIGUI ━━━${RESET}`)
    console.log(`  id        : ${user.id}`)
    console.log(`  nickname  : ${user.nickname}`)
    console.log(`  email     : ${user.email}`)
    console.log(`  isSystem  : ${user.isSystem ? GRN + "true" + RESET : YEL + "false" + RESET}  ${user.isSystem ? "(exclu des classements ✓)" : "(visible dans classements ⚠️)"}`)
    console.log(`  isTester  : ${user.isTester ? GRN + "true" + RESET : RED + "false" + RESET}  ${user.isTester ? "(panneau 🧪 actif ✓)" : "(pas de panneau ✗)"}`)
    console.log(`  createdAt : ${user.createdAt.toISOString()}`)
    console.log(`  updatedAt : ${user.updatedAt.toISOString()}`)

    const progress = await prisma.gamebookProgress.findUnique({
        where: { userId_chapterId: { userId: user.id, chapterId: "map_v3" } },
        select: {
            mapId: true,
            posX: true,
            posY: true,
            energySpentToday: true,
            bonusSurplus: true,
            lastSeen: true,
        },
    })

    if (progress) {
        console.log(`\n${GRN}━━━ GamebookProgress ━━━${RESET}`)
        console.log(`  mapId            : ${progress.mapId} (${progress.posX},${progress.posY})`)
        console.log(`  energySpentToday : ${progress.energySpentToday}`)
        console.log(`  bonusSurplus     : ${progress.bonusSurplus}`)
        console.log(`  lastSeen         : ${progress.lastSeen.toISOString()}`)
    } else {
        console.log(`\n${YEL}━━━ GamebookProgress ━━━${RESET}`)
        console.log(`  ${YEL}Absent${RESET} — sera créé au prochain GET /api/gamebook/state avec bonusSurplus=0.`)
    }

    // Daemon : accédé en raw SQL (modèle non exposé dans le client Prisma généré)
    try {
        const daemons = await prisma.$queryRawUnsafe(
            `SELECT "slotIndex", "name", "type", "combatLevel", "currentHp", "happiness" FROM "Daemon" WHERE "userId" = $1`,
            user.id
        )
        if (Array.isArray(daemons) && daemons.length > 0) {
            console.log(`\n${GRN}━━━ Daemons (${daemons.length}) ━━━${RESET}`)
            for (const d of daemons) {
                console.log(`  slot ${d.slotIndex} — ${d.name} [${d.type}] L${d.combatLevel} HP ${d.currentHp} 😊 ${d.happiness}`)
            }
        }
    } catch {
        // ignore (table Daemon peut ne pas exister sur certains environnements)
    }

    console.log(`\n${GRN}━━━ Checklist GUIGUI online ━━━${RESET}`)
    console.log(`  [${user.isSystem ? GRN + "✓" + RESET : RED + "✗" + RESET}] isSystem=true  → exclu auto des classements`)
    console.log(`  [${user.isTester ? GRN + "✓" + RESET : RED + "✗" + RESET}] isTester=true  → panneau 🧪 visible dans Nexus`)
    console.log(`  [?] GUIGUI_LOGIN_ENABLED=true  → vérifier dans .env (local) et Vercel (prod)`)
    console.log(``)

    await prisma.$disconnect()
}

main().catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
})
