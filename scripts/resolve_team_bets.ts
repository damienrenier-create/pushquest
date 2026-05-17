/**
 * resolve_team_bets.ts — Script de résolution de la Semaine des Équipes
 *
 * Usage :
 *   npx tsx scripts/resolve_team_bets.ts           → Affiche les scores finaux + gains estimés
 *   npx tsx scripts/resolve_team_bets.ts --confirm  → Résout en base via l'API
 *
 * ⚠️  Ne pas lancer avec --confirm avant la fin de la compétition (1er juin 2026).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const isDryRun = !process.argv.includes("--confirm");

const EXERCISE_LABELS: Record<string, string> = {
  PUSHUP: "Pompes 💪",
  PULLUP: "Tractions 🏋️",
  SQUAT: "Squats 🦵",
  PLANK: "Gainage 🧘",
};

async function main() {
  console.log(isDryRun
    ? "🔍 MODE DRY-RUN — aucune modification en base\n"
    : "⚡ MODE CONFIRM — résolution en base\n"
  );

  // 1. Récupérer tous les paris teamBet
  const bets = await (prisma as any).bet.findMany({
    where: { status: { in: ["OPEN", "LOCKED"] } },
    include: {
      entries: { where: { withdrawn: false } }
    }
  });

  const teamBets = bets.filter((b: any) => {
    try {
      const meta = JSON.parse(b.metadata || "{}");
      return meta.teamBet === true;
    } catch { return false; }
  });

  if (teamBets.length === 0) {
    console.log("❌ Aucun pari teamBet trouvé en OPEN ou LOCKED.");
    return;
  }

  console.log(`📋 ${teamBets.length} paris trouvés\n`);

  for (const bet of teamBets) {
    const meta = JSON.parse(bet.metadata);
    const { teamConfig } = meta;
    const { exercise, teams, competitionStart, competitionEnd } = teamConfig;

    console.log(`═══════════════════════════════════════════════════`);
    console.log(`📌 ${bet.title}`);
    console.log(`   Exercice : ${EXERCISE_LABELS[exercise] || exercise}`);
    console.log(`   Période  : ${competitionStart} → ${competitionEnd}`);
    console.log(`   Statut   : ${bet.status}`);

    // 2. Calculer les scores
    const allUserIds = [...teams.jaune, ...teams.rouge];
    const sets = await (prisma as any).exerciseSet.findMany({
      where: {
        userId: { in: allUserIds },
        exercise,
        date: { gte: competitionStart, lte: competitionEnd }
      },
      select: { userId: true, reps: true }
    });

    const repsByUser: Record<string, number> = {};
    for (const s of sets) {
      repsByUser[s.userId] = (repsByUser[s.userId] || 0) + s.reps;
    }

    const jauneTotal = teams.jaune.reduce((sum: number, uid: string) => sum + (repsByUser[uid] || 0), 0);
    const rougeTotal = teams.rouge.reduce((sum: number, uid: string) => sum + (repsByUser[uid] || 0), 0);

    console.log(`\n   🟡 JAUNE : ${jauneTotal}${exercise === "PLANK" ? "s" : " reps"}`);
    for (const uid of teams.jaune) {
      const users = await prisma.user.findUnique({ where: { id: uid }, select: { nickname: true } });
      console.log(`      ${users?.nickname || uid} : ${repsByUser[uid] || 0}`);
    }

    console.log(`   🔴 ROUGE : ${rougeTotal}${exercise === "PLANK" ? "s" : " reps"}`);
    for (const uid of teams.rouge) {
      const users = await prisma.user.findUnique({ where: { id: uid }, select: { nickname: true } });
      console.log(`      ${users?.nickname || uid} : ${repsByUser[uid] || 0}`);
    }

    let winnerKey: string | null = null;
    if (jauneTotal > rougeTotal) {
      winnerKey = "jaune";
      console.log(`\n   🏆 GAGNANT : 🟡 JAUNE (+${jauneTotal - rougeTotal})`);
    } else if (rougeTotal > jauneTotal) {
      winnerKey = "rouge";
      console.log(`\n   🏆 GAGNANT : 🔴 ROUGE (+${rougeTotal - jauneTotal})`);
    } else {
      console.log(`\n   ⚖️  ÉGALITÉ — aucune résolution possible automatiquement`);
    }

    // 3. Estimer les gains
    if (winnerKey) {
      console.log(`\n   💰 GAINS ESTIMÉS :`);
      const pool = bet.entries.reduce((s: number, e: any) => s + e.xpStaked, 0);
      const winners = bet.entries.filter((e: any) => e.option === winnerKey);
      const losers = bet.entries.filter((e: any) => e.option !== winnerKey);
      const totalWinnersStake = winners.reduce((s: number, e: any) => s + e.xpStaked, 0);

      for (const entry of winners) {
        const parimuShare = totalWinnersStake > 0 ? Math.floor((entry.xpStaked / totalWinnersStake) * pool) : 0;
        const bookmakerGain = entry.lockedOdd ? Math.floor(entry.xpStaked * entry.lockedOdd) : null;
        const bestGain = bookmakerGain ?? parimuShare;
        const uid = entry.userId;
        const user = await prisma.user.findUnique({ where: { id: uid }, select: { nickname: true } });
        console.log(`      ✅ ${user?.nickname} (${entry.xpStaked} XP misé) → +${bestGain} XP${bookmakerGain ? ` [cote ×${entry.lockedOdd}]` : " [parimutuel]"}`);
      }
      for (const entry of losers) {
        const uid = entry.userId;
        const user = await prisma.user.findUnique({ where: { id: uid }, select: { nickname: true } });
        console.log(`      ❌ ${user?.nickname} → 0 (perd ${entry.xpStaked} XP)`);
      }
    }

    // 4. Résoudre si --confirm
    if (!isDryRun && winnerKey) {
      try {
        // On appelle la route API de résolution
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const res = await fetch(`${baseUrl}/api/bets/${bet.id}/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ winnerOption: winnerKey })
        });
        const json = await res.json();
        if (res.ok) {
          console.log(`\n   ✅ RÉSOLU : ${bet.title} → ${winnerKey}`);
        } else {
          console.log(`\n   ❌ ERREUR API : ${JSON.stringify(json)}`);
        }
      } catch (e) {
        console.log(`   ❌ Erreur fetch :`, e);
      }
    } else if (!isDryRun && !winnerKey) {
      console.log(`   ⚠️  Égalité — résolution manuelle requise via l'admin.`);
    }
  }

  if (isDryRun) {
    console.log(`\n═══════════════════════════════════════════════════`);
    console.log(`Relancer avec --confirm pour résoudre en base :`);
    console.log(`  npx tsx scripts/resolve_team_bets.ts --confirm`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
