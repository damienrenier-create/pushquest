// Quick script to check Franss state in prod DB
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const FRANSS_USER_ID = "cmpgu4uq5000069du4s19q5l9"

// Use raw query to bypass Prisma client typing issues with new columns
const rows = await prisma.$queryRawUnsafe(`
    SELECT
        "mapId", "posX", "posY",
        "piaffiniRescued",
        "franssJokeBirdDone",
        "energySpentToday",
        "energySpentDate",
        "bonusSurplus",
        "inventory"
    FROM "GamebookProgress"
    WHERE "userId" = $1 AND "chapterId" = 'map_v3'
`, FRANSS_USER_ID)

console.log("--- État de Franss (raw SQL) ---")
console.log(JSON.stringify(rows[0], null, 2))

const swimSet = await prisma.badgeEvent.findMany({
    where: {
        badgeKey: "gamebook_sauveur_piaffini",
        toUserId: FRANSS_USER_ID,
        eventType: "UNIQUE_AWARDED",
    },
})
console.log("\nBadge Sauveur de PIAFFINI:", swimSet.length > 0 ? "OUI" : "NON")

const xp = await prisma.xpAdjustment.findMany({
    where: { userId: FRANSS_USER_ID, reason: "BADGE_SAUVEUR_PIAFFINI_GAMEBOOK" },
})
console.log("XP PIAFFINI (200):", xp.length > 0 ? "OUI" : "NON")

await prisma.$disconnect()
