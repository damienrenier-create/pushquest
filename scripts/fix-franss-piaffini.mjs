// One-shot fix : Franss a joué la blague PIAFFINI mais pas reçu le rescue.
// Force le rescue normal : piaffiniRescued + swim_set + badge + XP.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const FRANSS_USER_ID = "cmpgu4uq5000069du4s19q5l9"
const BADGE_KEY = "gamebook_sauveur_piaffini"
const XP_REWARD = 200

// Lis l'état actuel
const progress = await prisma.gamebookProgress.findUnique({
    where: { userId_chapterId: { userId: FRANSS_USER_ID, chapterId: "map_v3" } },
})

if (!progress) {
    console.log("Aucun progress pour Franss")
    process.exit(1)
}

console.log("AVANT :")
console.log("  piaffiniRescued:", progress.piaffiniRescued)
console.log("  inventory:", JSON.stringify(progress.inventory))

// Ajouter swim_set s'il n'est pas déjà là
const inventory = Array.isArray(progress.inventory) ? [...progress.inventory] : []
const hasSwimSet = inventory.some((e) => e?.itemKey === "swim_set")
if (!hasSwimSet) {
    inventory.push({ itemKey: "swim_set", quantity: 1 })
}

// Update piaffiniRescued + inventory
await prisma.gamebookProgress.update({
    where: { id: progress.id },
    data: {
        piaffiniRescued: true,
        inventory: inventory,
    },
})
console.log("\n→ piaffiniRescued = true")
console.log("→ swim_set ajouté à l'inventaire")

// Badge UNIQUE_AWARDED (idempotent)
const existingBadge = await prisma.badgeEvent.findFirst({
    where: { badgeKey: BADGE_KEY, toUserId: FRANSS_USER_ID, eventType: "UNIQUE_AWARDED" },
})
if (!existingBadge) {
    await prisma.badgeEvent.create({
        data: {
            badgeKey: BADGE_KEY,
            fromUserId: null,
            toUserId: FRANSS_USER_ID,
            eventType: "UNIQUE_AWARDED",
            previousValue: 0,
            newValue: 1,
            metadata: JSON.stringify({ source: "manual_fix_franss_joke_bypass", xpReward: XP_REWARD }),
        },
    })
    console.log("→ BadgeEvent Sauveur de PIAFFINI créé")
} else {
    console.log("→ BadgeEvent déjà présent")
}

// XP idempotent
const existingXp = await prisma.xpAdjustment.findFirst({
    where: { userId: FRANSS_USER_ID, reason: "BADGE_SAUVEUR_PIAFFINI_GAMEBOOK" },
})
if (!existingXp) {
    await prisma.xpAdjustment.create({
        data: {
            userId: FRANSS_USER_ID,
            amount: XP_REWARD,
            reason: "BADGE_SAUVEUR_PIAFFINI_GAMEBOOK",
            date: new Date().toISOString().slice(0, 10),
        },
    })
    console.log("→ XpAdjustment +200 XP créé")
} else {
    console.log("→ XpAdjustment déjà présent")
}

console.log("\n✓ Fix appliqué.")
await prisma.$disconnect()
