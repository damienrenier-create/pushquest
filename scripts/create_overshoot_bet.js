/**
 * create_overshoot_bet.js — Crée le pari "Défi du Dépassement" (Verts vs Bleus).
 *
 *   node scripts/create_overshoot_bet.js            → DRY-RUN (affiche, ne crée rien)
 *   node scripts/create_overshoot_bet.js --confirm  → crée le pari en base (OPEN)
 *
 * Mécanique : chaque % de dépassement du quota perso = 1 point pour l'équipe.
 * Compétition 2026-06-08 → 2026-06-14. Mises ouvertes dès la création, fermées
 * le 2026-06-08 00:00 Paris (= 07 22:00 UTC) — avant le début de la compète.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const CONFIRM = process.argv.includes("--confirm");

const ORACLE_ID = "cmosfbguk0000ct1vqkjwf6sx";

const TEAMS = {
  vert: [
    "cmopr0pw6000a5ubrn11oedxk", // Gg
    "cmml1r6um0000pto29d129npd", // Mools
    "cmml1yb61000fpto2bxd8i6fc", // Milkardashian
  ],
  bleu: [
    "cmml1wvc00006k6aaxjjfsfv0", // Neuneu
    "cmml1xpeu001lk6aau4s8e70t", // Xa
    "cmml4dogn00005n1setjnfikl", // Embi
  ],
};

const OPTIONS = [
  { key: "vert", label: "Verts 🟢" },
  { key: "bleu", label: "Bleus 🔵" },
];

const metadata = {
  teamBet: true,
  tagline: "Dépasse-toi. Chaque % au-dessus de ton quota fait gagner ton équipe.",
  manualOdds: [
    { key: "vert", label: "Verts 🟢", odd: 1.90, statLabel: "Gg + Mools + Milka — projection ~5533 pts / 2 mois" },
    { key: "bleu", label: "Bleus 🔵", odd: 1.75, statLabel: "Neuneu + Xa + Embi — projection ~6033 pts / 2 mois" },
  ],
  note: "Défi du Dépassement de Quota — Verts vs Bleus",
  resolveInstructions:
    "Comparer les points de dépassement de quota de chaque équipe sur 2026-06-08 → 2026-06-14 via scripts/resolve_overshoot_bet.ts. Points = somme par membre de max(0, floor((reps_jour - quota_jour)/quota_jour*100)).",
  teamConfig: {
    metric: "QUOTA_OVERSHOOT",
    competitionStart: "2026-06-08",
    competitionEnd: "2026-06-14",
    teams: TEAMS,
    display: {
      vert: { label: "Verts", emoji: "🟢", color: "green" },
      bleu: { label: "Bleus", emoji: "🔵", color: "blue" },
    },
  },
};

const DATA = {
  type: "PRONOSTIC",
  subType: "BINARY",
  title: "Le Défi du Dépassement — 🟢 Verts vs 🔵 Bleus",
  description:
    "Du 8 au 14 juin, chaque joueur essaie de dépasser le plus possible SON quota quotidien. Chaque % au-dessus du quota = 1 point pour son équipe (pile le quota ou en dessous = 0, pas de malus, pas de plafond). Sur qui paries-tu ?",
  options: JSON.stringify(OPTIONS),
  status: "OPEN",
  openAt: new Date(),
  closeAt: new Date("2026-06-07T22:00:00.000Z"), // 8 juin 00:00 Paris
  createdByUserId: ORACLE_ID,
  metadata: JSON.stringify(metadata),
};

async function main() {
  console.log(CONFIRM ? "⚡ MODE --confirm — création en base\n" : "🔍 DRY-RUN — rien créé\n");
  console.log("Titre   :", DATA.title);
  console.log("Options :", OPTIONS.map((o) => o.label).join("  vs  "));
  console.log("Période :", metadata.teamConfig.competitionStart, "→", metadata.teamConfig.competitionEnd);
  console.log("openAt  :", DATA.openAt.toISOString(), "(Early Bird démarre maintenant)");
  console.log("closeAt :", DATA.closeAt.toISOString(), "(mises fermées avant le début)");
  console.log("Cotes   :", metadata.manualOdds.map((o) => `${o.key} ${o.odd}`).join(" | "));
  console.log("🟢 Verts :", TEAMS.vert.length, "joueurs  |  🔵 Bleus :", TEAMS.bleu.length, "joueurs");

  if (!CONFIRM) {
    console.log("\nRelancer avec --confirm pour créer le pari.");
    return;
  }

  const created = await prisma.bet.create({ data: DATA });
  console.log("\n✅ Pari créé. ID :", created.id);
}

main().catch((e) => { console.error("❌", e); process.exit(1); }).finally(() => prisma.$disconnect());
