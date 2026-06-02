/**
 * resolve_overshoot_bet.ts — Résout le pari "Défi du Dépassement" (Verts vs Bleus).
 * À lancer APRÈS la fin de la compète (15 juin).
 *
 *   npx tsx scripts/resolve_overshoot_bet.ts            → DRY-RUN (calcule, n'écrit rien)
 *   npx tsx scripts/resolve_overshoot_bet.ts --confirm  → résout en base
 *
 * Gagnant = équipe avec le plus de points de dépassement sur toute la période.
 * Distribution répliquée depuis src/app/api/bets/[id]/resolve/route.ts.
 */
import { PrismaClient } from "@prisma/client";
import { calculateWinnings, calculateBookmakerBonus } from "../src/lib/bets";
import { overshootPointsForUser, datesInRange } from "../src/lib/overshoot";
import { getTodayISO } from "../src/lib/challenge";

const prisma = new PrismaClient();
const CONFIRM = process.argv.includes("--confirm");
const RESOLVER_NICK = "Oracle";

async function main() {
  console.log(CONFIRM ? "⚡ MODE --confirm — écriture en base\n" : "🔍 DRY-RUN — rien écrit\n");

  // Trouver le pari overshoot actif
  const bets = await (prisma as any).bet.findMany({
    where: { status: { in: ["OPEN", "LOCKED"] } },
    include: { entries: { include: { user: { select: { nickname: true } } } } },
  });
  const bet = bets.find((b: any) => {
    try { return JSON.parse(b.metadata || "{}")?.teamConfig?.metric === "QUOTA_OVERSHOOT"; } catch { return false; }
  });
  if (!bet) { console.log("❌ Aucun pari overshoot OPEN/LOCKED trouvé."); return; }

  const meta = JSON.parse(bet.metadata);
  const { competitionStart, competitionEnd, teams, display } = meta.teamConfig;
  console.log(`📌 ${bet.title}\n   Période : ${competitionStart} → ${competitionEnd}`);

  const today = getTodayISO();
  if (today <= competitionEnd) {
    console.log(`   ⚠️  La compète n'est pas terminée (aujourd'hui ${today} ≤ fin ${competitionEnd}). Calcul partiel.`);
  }

  // Calcul des points par équipe
  const teamKeys = Object.keys(teams);
  const allIds = teamKeys.flatMap((k) => teams[k]);
  const dates = datesInRange(competitionStart, competitionEnd);
  const users = await prisma.user.findMany({
    where: { id: { in: allIds } },
    select: { id: true, nickname: true, onboardingStartedAt: true },
  });
  const userMap = Object.fromEntries(users.map((u: any) => [u.id, u]));
  const sets = await (prisma as any).exerciseSet.findMany({
    where: { userId: { in: allIds }, date: { gte: competitionStart, lte: competitionEnd } },
    select: { userId: true, date: true, exercise: true, reps: true, offeredToUserId: true },
  });
  const setsByUser: Record<string, any[]> = {};
  for (const s of sets) (setsByUser[s.userId] ??= []).push(s);

  const totals: Record<string, number> = {};
  for (const k of teamKeys) {
    let t = 0;
    console.log(`\n   ${display?.[k]?.emoji ?? ""} ${display?.[k]?.label ?? k} :`);
    for (const id of teams[k]) {
      const pts = userMap[id] ? overshootPointsForUser(userMap[id], setsByUser[id] ?? [], dates) : 0;
      console.log(`      ${userMap[id]?.nickname ?? id} : +${pts}%`);
      t += pts;
    }
    totals[k] = t;
    console.log(`      TOTAL : ${t} pts`);
  }

  const [kA, kB] = teamKeys;
  const winner = totals[kA] > totals[kB] ? kA : totals[kB] > totals[kA] ? kB : null;
  if (!winner) { console.log("\n⚖️ ÉGALITÉ — résolution manuelle requise."); return; }
  console.log(`\n🏆 GAGNANT : ${display?.[winner]?.label ?? winner} (${totals[winner]} vs ${totals[winner === kA ? kB : kA]})`);

  // Distribution (réplique resolve route)
  const distribution = calculateWinnings(bet.entries, winner);
  const activeWinners = bet.entries.filter((e: any) => !e.withdrawn && e.option === winner);
  const isSingleBettor = activeWinners.length === 1;
  const nick = (uid: string) => bet.entries.find((e: any) => e.userId === uid)?.user?.nickname || uid;

  console.log("\n💰 Distribution :");
  for (const w of distribution) {
    const entry = bet.entries.find((e: any) => e.userId === w.userId && !e.withdrawn);
    const bonus = entry?.lockedOdd ? calculateBookmakerBonus(entry.xpStaked, entry.lockedOdd, w.xpGain, 3) : 0;
    console.log(`   ✅ ${nick(w.userId)} → +${w.xpGain} BET_WIN${bonus > 0 ? ` +${bonus} BET_BONUS` : ""}`);
  }
  for (const l of bet.entries.filter((e: any) => !e.withdrawn && e.option !== winner)) {
    console.log(`   ❌ ${nick(l.userId)} → perd ${l.xpStaked} XP`);
  }

  if (!CONFIRM) { console.log("\nRelancer avec --confirm pour résoudre."); return; }

  const resolver = await prisma.user.findFirst({ where: { nickname: RESOLVER_NICK } });
  if (!resolver) { console.log("❌ Résolveur introuvable"); return; }
  const todayISO = getTodayISO();

  await (prisma as any).$transaction(async (tx: any) => {
    await tx.betResult.create({ data: {
      betId: bet.id, winnerOption: winner, resolvedByUserId: resolver.id,
      distributionSnapshot: JSON.stringify(distribution),
      note: [isSingleBettor ? "single_bettor_capped" : null, "overshoot_resolved"].filter(Boolean).join(" | "),
    }});
    await tx.bet.update({ where: { id: bet.id }, data: { status: "RESOLVED", resolvedOption: winner, resolvedAt: new Date(), resolvedByUserId: resolver.id } });
    for (const w of distribution) {
      await tx.xpAdjustment.create({ data: { userId: w.userId, amount: w.xpGain, reason: `BET_WIN:${bet.id}:${bet.title}`, date: todayISO } });
      const entry = bet.entries.find((e: any) => e.userId === w.userId && !e.withdrawn);
      if (entry?.lockedOdd) {
        const bonus = calculateBookmakerBonus(entry.xpStaked, entry.lockedOdd, w.xpGain, 3);
        if (bonus > 0) await tx.xpAdjustment.create({ data: { userId: w.userId, amount: bonus, reason: `BET_BONUS:${bet.id}:${bet.title}`, date: todayISO } });
      }
    }
    await tx.betEvent.create({ data: { betId: bet.id, userId: resolver.id, eventType: "RESOLVE", metadata: JSON.stringify({ winnerOption: winner, distributionCount: distribution.length }) } });
  });
  console.log("\n💾 RÉSOLU EN BASE.");
}

main().catch((e) => { console.error("❌", e); process.exit(1); }).finally(() => prisma.$disconnect());
