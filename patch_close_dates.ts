import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 26 mai 2026 à 00h00 heure de Paris (UTC+2 en mai = UTC 22h00 le 25)
  const newCloseAt = new Date('2026-05-25T22:00:00.000Z');

  const betIds = [
    'cmosxevv20001kpdm25e1uzd4',  // Écart XP
    'cmosxew100003kpdmxy1b5p6n',  // Milkardashian top 3
  ];

  for (const betId of betIds) {
    const before = await (prisma as any).bet.findUnique({ where: { id: betId }, select: { title: true, closeAt: true } });
    console.log(`\n📋 ${before.title}`);
    console.log(`   Avant  : ${new Date(before.closeAt).toLocaleString('fr-FR')}`);

    await (prisma as any).bet.update({
      where: { id: betId },
      data: { closeAt: newCloseAt }
    });

    const after = await (prisma as any).bet.findUnique({ where: { id: betId }, select: { closeAt: true } });
    console.log(`   Après  : ${new Date(after.closeAt).toLocaleString('fr-FR')}`);
    console.log(`   ✅ OK`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
