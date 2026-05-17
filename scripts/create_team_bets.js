/**
 * create_team_bets.js — Script one-shot de création des 4 paris Semaine des Équipes
 *
 * Usage : node scripts/create_team_bets.js
 *
 * ⚠️  Ne PAS exécuter automatiquement — attendre la validation manuelle.
 * Ce script crée 4 paris directement en OPEN avec openAt = now.
 * Il bypasse l'API (qui force DRAFT) pour injecter le metadata complet.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ORACLE_ID = "cmosfbguk0000ct1vqkjwf6sx";
const CLOSE_AT = new Date("2026-05-27T06:00:00.000Z"); // Verrouillage cron 6h le 27 mai

const TEAMS = {
  jaune: ["cmml1xpeu001lk6aau4s8e70t", "cmml4dogn00005n1setjnfikl", "cmopr0pw6000a5ubrn11oedxk"],
  rouge: ["cmml1wvc00006k6aaxjjfsfv0", "cmml1r6um0000pto29d129npd", "cmml1yb61000fpto2bxd8i6fc"],
};

const OPTIONS = [
  { key: "jaune", label: "Équipe Jaune 🟡" },
  { key: "rouge", label: "Équipe Rouge 🔴" },
];

const BETS = [
  {
    title: "Semaine des Équipes — Pompes 💪",
    description: "Quelle équipe fera le plus de pompes du 25 mai au 1er juin ?",
    tagline: "Les bras qui plient décident du destin.",
    exercise: "PUSHUP",
    manualOdds: [
      { key: "jaune", label: "Équipe Jaune 🟡", odd: 2.00, statLabel: "3 425 pompes / 2 semaines" },
      { key: "rouge", label: "Équipe Rouge 🔴", odd: 1.67, statLabel: "4 095 pompes / 2 semaines" },
    ],
  },
  {
    title: "Semaine des Équipes — Tractions 🏋️",
    description: "Quelle équipe fera le plus de tractions du 25 mai au 1er juin ?",
    tagline: "S'élever ou périr — la gravité ne pardonne pas.",
    exercise: "PULLUP",
    manualOdds: [
      { key: "jaune", label: "Équipe Jaune 🟡", odd: 1.85, statLabel: "249 tractions / 2 semaines" },
      { key: "rouge", label: "Équipe Rouge 🔴", odd: 1.79, statLabel: "257 tractions / 2 semaines" },
    ],
  },
  {
    title: "Semaine des Équipes — Squats 🦵",
    description: "Quelle équipe fera le plus de squats du 25 mai au 1er juin ?",
    tagline: "Les jambes portent les empires.",
    exercise: "SQUAT",
    manualOdds: [
      { key: "jaune", label: "Équipe Jaune 🟡", odd: 1.72, statLabel: "2 058 squats / 2 semaines" },
      { key: "rouge", label: "Équipe Rouge 🔴", odd: 1.92, statLabel: "1 844 squats / 2 semaines" },
    ],
  },
  {
    title: "Semaine des Équipes — Gainage 🧘",
    description: "Quelle équipe fera le plus de gainage du 25 mai au 1er juin ?",
    tagline: "La tempête s'en prend aux faibles. Les forts tiennent.",
    exercise: "PLANK",
    manualOdds: [
      { key: "jaune", label: "Équipe Jaune 🟡", odd: 1.61, statLabel: "3 710s gainage / 2 semaines" },
      { key: "rouge", label: "Équipe Rouge 🔴", odd: 2.08, statLabel: "2 875s gainage / 2 semaines" },
    ],
  },
];

async function main() {
  console.log("🎲 Création des 4 paris Semaine des Équipes...\n");

  const createdIds = [];

  for (const bet of BETS) {
    const metadata = JSON.stringify({
      teamBet: true,
      tagline: bet.tagline,
      manualOdds: bet.manualOdds,
      note: `Semaine des Équipes — ${bet.exercise}`,
      resolveInstructions: `Comparer les reps réels de chaque équipe sur la période 2026-05-25 → 2026-06-01 via le script resolve_team_bets.ts. Exercice : ${bet.exercise}. Volume brut (pour PLANK : secondes brutes, pas /5).`,
      teamConfig: {
        competitionStart: "2026-05-25",
        competitionEnd: "2026-06-01",
        exercise: bet.exercise,
        teams: TEAMS,
      },
    });

    const created = await prisma.bet.create({
      data: {
        type: "PRONOSTIC",
        subType: "BINARY",
        title: bet.title,
        description: bet.description,
        options: JSON.stringify(OPTIONS),
        status: "OPEN",
        openAt: new Date(),          // ← critique pour Early Bird
        closeAt: CLOSE_AT,
        createdByUserId: ORACLE_ID,
        metadata,
      },
    });

    createdIds.push(created.id);
    console.log(`✅ ${bet.title}`);
    console.log(`   ID : ${created.id}`);
    console.log(`   Exercise : ${bet.exercise} | closeAt : ${CLOSE_AT.toISOString()}\n`);
  }

  console.log("══════════════════════════════════════════");
  console.log("🎉 4 paris créés avec succès. IDs :");
  createdIds.forEach((id, i) => console.log(`   [${i + 1}] ${id}`));
  console.log("\n⚡ Ajouter ces IDs dans resolve_team_bets.ts si nécessaire.");
}

main()
  .catch((e) => {
    console.error("❌ Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
