const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { BADGE_DEFINITIONS } = require('../src/config/badges')

async function initBadges() {
    for (const def of BADGE_DEFINITIONS) {
        const { type, condition, rarity, addedAt, ...dbDef } = def;
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
}

async function main() {
  console.log('Initializing badges...')
  await initBadges()
  console.log('Done.')
  const ownership = await prisma.badgeOwnership.findUnique({
    where: { badgeKey: 'torch_legacy' },
    include: { currentUser: true }
  })
  console.log('Ownership after init:', JSON.stringify(ownership, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
