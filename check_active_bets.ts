import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const bets = await prisma.bet.findMany({
    where: { status: { in: ['OPEN', 'LOCKED'] } },
    include: {
      entries: {
        where: { withdrawn: false },
        include: { user: { select: { nickname: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  for (const bet of bets) {
    console.log('\n══════════════════════════════════════════');
    console.log(`📋 TITRE   : ${bet.title}`);
    console.log(`🆔 ID      : ${bet.id}`);
    console.log(`📌 STATUS  : ${bet.status}`);
    console.log(`⏰ CLÔTURE : ${bet.closeAt ? new Date(bet.closeAt).toLocaleString('fr-FR') : 'NON DÉFINIE'}`);
    const options = typeof bet.options === 'string' ? JSON.parse(bet.options) : bet.options;
    console.log(`🎯 OPTIONS : ${options.map((o: any) => `${o.key}="${o.label}"`).join(' | ')}`);
    console.log(`👥 PARIEURS (${bet.entries.length}):`);
    for (const e of bet.entries) {
      console.log(`   - ${e.user.nickname.padEnd(20)} → ${e.option} | ${e.xpStaked} XP misés | cote ×${e.lockedOdd?.toFixed(2) ?? '?'}`);
    }
    const totalPool = bet.entries.reduce((s, e) => s + e.xpStaked, 0);
    console.log(`💰 POOL TOTAL : ${totalPool} XP`);
  }

  console.log('\n══════════════════════════════════════════');
  console.log(`Total paris actifs : ${bets.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
