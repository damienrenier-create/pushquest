const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Simplified BADGE_DEFINITIONS for the script
const BADGE_DEFINITIONS = [
    { key: "torch_daily", name: "Flambeau Quotidien", emoji: "🔥", rarity: "COMMON", category: "REGULARITY", metricType: "TECHNICAL", type: "TECHNICAL", exerciseScope: "ALL", description: "Badge technique pour le premier validateur du jour", condition: "Être le premier à valider son quota.", addedAt: "2026-04-29" }
];

async function main() {
  for (const dbDef of BADGE_DEFINITIONS) {
    console.log(`Upserting ${dbDef.key}...`)
    await prisma.badgeDefinition.upsert({
        where: { key: dbDef.key },
        update: { ...dbDef },
        create: { ...dbDef },
    });
    await prisma.badgeOwnership.upsert({
        where: { badgeKey: dbDef.key },
        update: {},
        create: { badgeKey: dbDef.key },
    });
  }
  console.log('Done.')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
