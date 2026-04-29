const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const key = 'torch_legacy'
  console.log(`Checking/Creating ${key}...`)
  
  await prisma.badgeDefinition.upsert({
    where: { key },
    update: { 
        name: "Gardien du Flambeau",
        emoji: "🚩",
        description: "A gardé le Flambeau pendant plusieurs jours",
        metricType: "TORCH_STREAK",
        exerciseScope: "ALL"
    },
    create: { 
        key,
        name: "Gardien du Flambeau",
        emoji: "🚩",
        description: "A gardé le Flambeau pendant plusieurs jours",
        metricType: "TORCH_STREAK",
        exerciseScope: "ALL"
    },
  });

  await prisma.badgeOwnership.upsert({
    where: { badgeKey: key },
    update: {},
    create: { badgeKey: key },
  });

  const ownership = await prisma.badgeOwnership.findUnique({
    where: { badgeKey: key },
    include: { currentUser: true }
  })
  console.log('Ownership:', JSON.stringify(ownership, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
