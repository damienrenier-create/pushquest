import { PrismaClient } from '@prisma/client';
import { calculateEarlyBirdMultiplier } from './src/lib/bets';

const prisma = new PrismaClient();

async function main() {
  const betIds = [
    'cmosxevv20001kpdm25e1uzd4',  // Écart XP
    'cmosxew100003kpdmxy1b5p6n',  // Milkardashian top 3
  ];

  for (const betId of betIds) {
    const bet = await (prisma as any).bet.findUnique({
      where: { id: betId },
      include: {
        entries: {
          where: { withdrawn: false },
          include: { user: { select: { nickname: true } } },
          orderBy: { placedAt: 'asc' }
        },
        events: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!bet) { console.log(`Pari ${betId} introuvable`); continue; }

    const openAt = new Date(bet.openedAt || bet.createdAt);
    const closeAt = new Date(bet.closeAt);
    const totalDaysMs = closeAt.getTime() - openAt.getTime();
    const totalDays = totalDaysMs / (1000 * 60 * 60 * 24);

    console.log(`\n══════════════════════════════════════════════════════`);
    console.log(`📋 ${bet.title}`);
    console.log(`📅 Ouverture  : ${openAt.toLocaleString('fr-FR')}`);
    console.log(`⏰ Clôture    : ${closeAt.toLocaleString('fr-FR')}`);
    console.log(`📏 Durée      : ${totalDays.toFixed(1)} jours → EarlyBird Mmax = ${totalDays <= 7 ? 1.2 : totalDays <= 30 ? 1.5 : 2.0}`);
    console.log(`\n  PARIEURS :`);

    for (const entry of bet.entries) {
      // Trouver le BetEvent STAKE pour cet userId
      const stakeEvent = bet.events.find((ev: any) =>
        ev.eventType === 'STAKE' && ev.userId === entry.userId
      );

      const placedAt = stakeEvent ? new Date(stakeEvent.createdAt) : new Date(entry.placedAt);
      const msSinceOpen = placedAt.getTime() - openAt.getTime();
      const hoursAfterOpen = (msSinceOpen / (1000 * 60 * 60)).toFixed(1);
      const inGracePeriod = msSinceOpen <= 24 * 60 * 60 * 1000;
      const earlyBird = calculateEarlyBirdMultiplier(openAt, closeAt, placedAt);

      console.log(`\n  👤 ${entry.user.nickname}`);
      console.log(`     Option            : ${entry.option}`);
      console.log(`     Misé              : ${entry.xpStaked} XP`);
      console.log(`     Heure de mise     : ${placedAt.toLocaleString('fr-FR')}`);
      console.log(`     Délai après ouv.  : ${hoursAfterOpen}h ${inGracePeriod ? '✅ (dans grace period 24h)' : '⚠️ (hors grace period)'}`);
      console.log(`     Early Bird appliqué : ×${earlyBird.toFixed(4)}`);
      console.log(`     lockedOdd en BDD    : ${entry.lockedOdd ?? '❌ NULL'}`);
      console.log(`     multiplier en BDD   : ${entry.multiplier}`);
    }

    // Afficher tous les events pour vérification
    console.log(`\n  EVENTS BRUTS :`);
    for (const ev of bet.events) {
      console.log(`     [${ev.eventType.padEnd(10)}] userId=${ev.userId.slice(0,12)}… | ${new Date(ev.createdAt).toLocaleString('fr-FR')} | meta=${ev.metadata ?? 'null'}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
