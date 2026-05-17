import { PrismaClient } from '@prisma/client';
import { calculateEarlyBirdMultiplier } from './src/lib/bets';

const prisma = new PrismaClient();

// Cotes bookmaker de base (cote de base affichée sur l'UI, sans Early Bird)
const BASE_ODDS: Record<string, Record<string, number>> = {
  // Pari "Écart XP"
  'cmosxevv20001kpdm25e1uzd4': {
    'creuser': 2.02,
    'reduire': 1.65,
  },
  // Pari "Milkardashian top 3"
  'cmosxew100003kpdmxy1b5p6n': {
    'oui': 99.0, // très longue cote pour "oui"
    'non': 1.01,
  }
};

async function main() {
  const betIds = Object.keys(BASE_ODDS);

  for (const betId of betIds) {
    const bet = await (prisma as any).bet.findUnique({
      where: { id: betId },
      include: {
        entries: { where: { withdrawn: false }, include: { user: { select: { nickname: true } } } },
        events: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!bet) { console.log(`Pari ${betId} introuvable`); continue; }

    console.log(`\n══════════════════════════════════════════`);
    console.log(`📋 ${bet.title}`);
    console.log(`📅 Ouverture : ${new Date(bet.openedAt || bet.createdAt).toLocaleString('fr-FR')}`);
    console.log(`⏰ Clôture   : ${new Date(bet.closeAt).toLocaleString('fr-FR')}`);

    for (const entry of bet.entries) {
      // Trouver l'événement ENTER correspondant à cet userId
      const enterEvent = bet.events.find((ev: any) =>
        ev.eventType === 'ENTER' && ev.userId === entry.userId
      );

      const betAtTime = enterEvent ? new Date(enterEvent.createdAt) : null;

      if (!betAtTime) {
        console.log(`\n  👤 ${entry.user.nickname} — aucun événement ENTER trouvé en BetEvent`);
        continue;
      }

      const openAt = new Date(bet.openedAt || bet.createdAt);
      const closeAt = new Date(bet.closeAt);
      const earlyBird = calculateEarlyBirdMultiplier(openAt, closeAt, betAtTime);
      const baseOdd = BASE_ODDS[betId]?.[entry.option] ?? null;
      const finalOdd = baseOdd ? parseFloat((baseOdd * earlyBird).toFixed(2)) : null;
      const expectedGain = finalOdd ? Math.floor(entry.xpStaked * finalOdd) : null;

      console.log(`\n  👤 ${entry.user.nickname}`);
      console.log(`     Option    : ${entry.option}`);
      console.log(`     Misé      : ${entry.xpStaked} XP`);
      console.log(`     Heure     : ${betAtTime.toLocaleString('fr-FR')}`);
      console.log(`     Early Bird: ×${earlyBird.toFixed(4)}`);
      console.log(`     Cote base : ×${baseOdd}`);
      console.log(`     Cote finale (lockedOdd attendu) : ×${finalOdd}`);
      console.log(`     Gain garanti si victoire         : ${expectedGain} XP`);
      console.log(`     lockedOdd stocké en BDD          : ${entry.lockedOdd ?? '❌ NULL'}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
