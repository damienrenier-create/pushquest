const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bets = await prisma.bet.findMany({
    select: { id: true, title: true, metadata: true }
  });
  console.log(JSON.stringify(bets, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
