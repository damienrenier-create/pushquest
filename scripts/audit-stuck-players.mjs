// Audit des joueurs potentiellement coincés en position bloquante.
// Liste les userId + nickname + mapId + posX/posY pour chaque joueur.
// Pour vérifier manuellement (ou via une route admin) si chaque position est walkable.
//
// Run : node scripts/audit-stuck-players.mjs
//
// AUCUNE écriture en DB. Lecture seule.

import { MAPS } from "../src/lib/gamebook/maps.ts"
import { isBlockingTile, INTERIOR_ENTRY_POSITIONS } from "../src/lib/gamebook/mapEngine.ts"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const RED = "\x1b[31m"
const YEL = "\x1b[33m"
const GRN = "\x1b[32m"
const CYAN = "\x1b[36m"
const RESET = "\x1b[0m"

async function main() {
    console.log(`${CYAN}━━━ AUDIT JOUEURS COINCÉS ━━━${RESET}\n`)
    const progresses = await prisma.gamebookProgress.findMany({
        include: { user: { select: { id: true, nickname: true, isSystem: true } } },
    })

    let stuck = 0
    let ok = 0
    let mapMissing = 0

    for (const p of progresses) {
        const mapId = p.mapId
        const posX = p.posX
        const posY = p.posY
        const nickname = p.user?.nickname ?? "(no nickname)"
        const isSystem = p.user?.isSystem ?? false

        const map = MAPS.find((m) => m.id === mapId)
        if (!map) {
            console.log(`${RED}[MAP MISSING]${RESET} ${nickname}${isSystem ? " [SYS]" : ""} → mapId="${mapId}" (introuvable) at (${posX},${posY})`)
            mapMissing++
            continue
        }

        const row = map.tiles?.[posY]
        const tile = row?.[posX]
        if (!tile) {
            console.log(`${RED}[OUT OF BOUNDS]${RESET} ${nickname}${isSystem ? " [SYS]" : ""} → ${mapId} (${posX},${posY}) hors map ${map.tiles?.[0]?.length ?? "?"}x${map.tiles?.length ?? "?"}`)
            stuck++
            continue
        }

        if (isBlockingTile(tile)) {
            console.log(`${RED}[STUCK]${RESET} ${nickname}${isSystem ? " [SYS]" : ""} → ${mapId} (${posX},${posY}) tile="${tile}" BLOQUANTE`)
            stuck++
        } else {
            ok++
        }
    }

    console.log(`\n${CYAN}━━━ RÉSUMÉ ━━━${RESET}`)
    console.log(`${GRN}OK${RESET} : ${ok}`)
    console.log(`${RED}Coincés${RESET} : ${stuck}`)
    console.log(`${YEL}Map manquante${RESET} : ${mapMissing}`)

    await prisma.$disconnect()
}

main().catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
})
