import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const betIds = [
    'cmosxevv20001kpdm25e1uzd4',
    'cmosxew100003kpdmxy1b5p6n',
  ];

  for (const betId of betIds) {
    // Récupérer TOUS les events de ce pari, tous types confondus
    const events = await (prisma as any).betEvent.findMany({
      where: { betId },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`\n══ BetEvents pour ${betId} ══`);
    if (events.length === 0) {
      console.log('  ⚠️  Aucun BetEvent trouvé !');
    }
    for (const ev of events) {
      console.log(`  [${ev.eventType}] userId=${ev.userId} | ${new Date(ev.createdAt).toLocaleString('fr-FR')} | meta=${ev.metadata}`);
    }

    // Récupérer aussi les entries avec leurs timestamps
    const entries = await (prisma as any).betEntry.findMany({
      where: { betId, withdrawn: false },
      include: { user: { select: { nickname: true } } },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`\n  BetEntry timestamps :`);
    for (const e of entries) {
      console.log(`  ${e.user.nickname.padEnd(20)} | option=${e.option} | ${e.xpStaked} XP | lockedOdd=${e.lockedOdd} | créé le ${new Date(e.createdAt).toLocaleString('fr-FR')}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
