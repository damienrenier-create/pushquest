const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const ownerships = await prisma.badgeOwnership.findMany()
  console.log('Total Ownerships:', ownerships.length)
  console.log('Keys:', ownerships.map(o => o.badgeKey).join(', '))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
