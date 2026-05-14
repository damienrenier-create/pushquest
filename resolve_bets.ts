import { PrismaClient } from '@prisma/client';
import { calculateWinnings, calculateBookmakerBonus } from './src/lib/bets';

const prisma = new PrismaClient();

function getTodayISO() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

async function resolveBet(betId: string, winnerOption: string, resolvedByUserId: string) {
  const bet = await prisma.bet.findUnique({
    where: { id: betId },
    include: { entries: true }
  });

  if (!bet || (bet.status !== "OPEN" && bet.status !== "LOCKED")) {
    console.log(`Bet ${betId} not open/locked or not found.`);
    return;
  }

  const existingResult = await prisma.betResult.findUnique({
    where: { betId }
  });
  if (existingResult) {
    console.log(`Bet ${betId} already resolved.`);
    return;
  }

  const distribution = calculateWinnings(bet.entries, winnerOption);
  const today = getTodayISO();

  const activeWinners = bet.entries.filter((e: any) => !e.withdrawn && e.option === winnerOption);
  const isSingleBettor = activeWinners.length === 1;
  const maxBonusMultiplier = 3;

  await prisma.$transaction(async (tx: any) => {
    await tx.betResult.create({
      data: {
        betId,
        winnerOption,
        resolvedByUserId,
        distributionSnapshot: JSON.stringify(distribution),
        note: isSingleBettor ? 'single_bettor_capped' : null,
      }
    });

    await tx.bet.update({
      where: { id: betId },
      data: {
        status: "RESOLVED",
        resolvedOption: winnerOption,
        resolvedAt: new Date(),
        resolvedByUserId,
      }
    });

    for (const winner of distribution) {
      await tx.xpAdjustment.create({
        data: {
          userId: winner.userId,
          amount: winner.xpGain,
          reason: `BET_WIN:${betId}:${bet.title}`,
          date: today,
        }
      });
      const winnerEntry = bet.entries.find((e: any) => e.userId === winner.userId && !e.withdrawn);
      if (winnerEntry?.lockedOdd) {
        const bonus = calculateBookmakerBonus(
          winnerEntry.xpStaked,
          winnerEntry.lockedOdd,
          winner.xpGain,
          maxBonusMultiplier
        );
        if (bonus > 0) {
          await tx.xpAdjustment.create({
            data: {
              userId: winner.userId,
              amount: bonus,
              reason: `BET_BONUS:${betId}:${bet.title}`,
              date: today,
            }
          });
        }
      }
    }

    await tx.betEvent.create({
      data: {
        betId,
        userId: resolvedByUserId,
        eventType: "RESOLVE",
        metadata: JSON.stringify({
          winnerOption,
          distributionCount: distribution.length,
        }),
      }
    });
  });

  console.log(`Resolved bet ${bet.title} with winner ${winnerOption}. Distributions: ${distribution.length}`);
}

async function main() {
  const admin = await prisma.user.findFirst({ where: { isSystem: true } }) || await prisma.user.findFirst();
  if (!admin) throw new Error("No user found");

  const bets = await prisma.bet.findMany({
    where: { status: { in: ['OPEN', 'LOCKED'] } }
  });

  for (const bet of bets) {
    if (bet.title.includes("Combien de joueurs valideront leur quota")) {
      await resolveBet(bet.id, "trois_quatre", admin.id);
    }
    if (bet.title.includes("Gg validera-t-il son quota")) {
      await resolveBet(bet.id, "oui", admin.id);
    }
    if (bet.title.includes("Qui portera le Flambeau Quotidien le soir du 12 mai")) {
      await resolveBet(bet.id, "mools", admin.id);
    }
    if (bet.title.includes("Duel inaugural — Xa vs Neuneu")) {
      await resolveBet(bet.id, "xa", admin.id);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
