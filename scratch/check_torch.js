const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const ownership = await prisma.badgeOwnership.findUnique({
    where: { badgeKey: 'torch_legacy' },
    include: { currentUser: true }
  })
  console.log('Ownership:', JSON.stringify(ownership, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
