/**
 * teamBadge.ts — Config et helpers pour la Semaine des Équipes
 * Période active : 17 mai → 1er juin 2026
 * Ne pas modifier les IDs joueurs sans mettre à jour betTemplates.ts en parallèle.
 */

export const TEAM_CONFIG = {
  active: { from: "2026-05-17", to: "2026-06-01" },
  jaune: {
    userIds: [
      "cmml1xpeu001lk6aau4s8e70t", // Xa
      "cmml4dogn00005n1setjnfikl",  // Embi
      "cmopr0pw6000a5ubrn11oedxk",  // Gg
    ],
    label: "Jaune",
    badge: "🟡" as const,
  },
  rouge: {
    userIds: [
      "cmml1wvc00006k6aaxjjfsfv0", // Neuneu
      "cmml1r6um0000pto29d129npd", // Mools
      "cmml1yb61000fpto2bxd8i6fc", // Milkardashian
    ],
    label: "Rouge",
    badge: "🔴" as const,
  },
} as const;

/**
 * Retourne la pastille d'équipe d'un joueur, ou null s'il n'est dans aucune équipe.
 * Fonction pure — ne dépend pas de la date.
 */
export function getTeamBadge(userId: string): "🟡" | "🔴" | null {
  if (TEAM_CONFIG.jaune.userIds.includes(userId as any)) return "🟡";
  if (TEAM_CONFIG.rouge.userIds.includes(userId as any)) return "🔴";
  return null;
}

/**
 * Vérifie si la période de la Semaine des Équipes est active.
 * Prend `now` en paramètre pour être utilisable côté serveur ET dans les tests,
 * sans jamais appeler Date.now() côté client (évite le flash hydratation).
 */
export function isTeamPeriodActive(now: Date = new Date()): boolean {
  const todayISO = now.toISOString().split("T")[0];
  return todayISO >= TEAM_CONFIG.active.from && todayISO <= TEAM_CONFIG.active.to;
}

/**
 * Retourne la clé d'équipe ("jaune" | "rouge") d'un userId, ou null.
 */
export function getTeamKey(userId: string): "jaune" | "rouge" | null {
  if (TEAM_CONFIG.jaune.userIds.includes(userId as any)) return "jaune";
  if (TEAM_CONFIG.rouge.userIds.includes(userId as any)) return "rouge";
  return null;
}
