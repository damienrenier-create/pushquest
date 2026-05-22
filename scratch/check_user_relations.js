const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = 'cmpgu4uq5000069du4s19q5l9';
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      gamebookProgress: true,
      coinAdjustments: true,
      xpAdjustments: true,
      badges: true
    }
  });
  console.log(JSON.stringify(user, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
