const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Renaming TORCH_CLAIM events to use torch_daily...')
  const result = await prisma.badgeEvent.updateMany({
    where: { eventType: 'TORCH_CLAIM', badgeKey: 'torch_legacy' },
    data: { badgeKey: 'torch_daily' }
  })
  console.log(`Updated ${result.count} events.`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
