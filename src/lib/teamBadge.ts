export const TEAM_CONFIG = {
  active: { from: "2026-05-17", to: "2026-06-01" },
  jaune: {
    userIds: [
      "cmml1xpeu001lk6aau4s8e70t", // Xa
      "cmml4dogn00005n1setjnfikl",  // Embi
      "cmopr0pw6000a5ubrn11oedxk",  // Gg
    ],
    badge: "🟡",
  },
  rouge: {
    userIds: [
      "cmml1wvc00006k6aaxjjfsfv0", // Neuneu
      "cmml1r6um0000pto29d129npd", // Mools
      "cmml1yb61000fpto2bxd8i6fc", // Milka
    ],
    badge: "🔴",
  },
} as const;

export function getTeamBadge(userId: string): "🟡" | "🔴" | null {
  if (TEAM_CONFIG.jaune.userIds.includes(userId as any)) return "🟡";
  if (TEAM_CONFIG.rouge.userIds.includes(userId as any)) return "🔴";
  return null;
}

export function isTeamPeriodActive(now: Date): boolean {
  const from = new Date(TEAM_CONFIG.active.from);
  const to = new Date(TEAM_CONFIG.active.to + "T23:59:59");
  return now >= from && now <= to;
}
