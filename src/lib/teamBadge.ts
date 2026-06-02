// Équipes du "Défi du Dépassement" — Verts vs Bleus.
// Verts = équipe de Gg (+ Mools, Milka, Franss) · Bleus = équipe de Neuneu (+ Xa, Embi).
export const TEAM_CONFIG = {
  active: { from: "2026-06-02", to: "2026-06-14" },
  vert: {
    userIds: [
      "cmopr0pw6000a5ubrn11oedxk", // Gg
      "cmml1r6um0000pto29d129npd", // Mools
      "cmml1yb61000fpto2bxd8i6fc", // Milkardashian
      "cmpgu4uq5000069du4s19q5l9", // Franss
    ],
    badge: "🟢",
  },
  bleu: {
    userIds: [
      "cmml1wvc00006k6aaxjjfsfv0", // Neuneu
      "cmml1xpeu001lk6aau4s8e70t", // Xa
      "cmml4dogn00005n1setjnfikl", // Embi
    ],
    badge: "🔵",
  },
} as const;

export type TeamKey = "vert" | "bleu";

export function getTeamKey(userId: string): TeamKey | null {
  if (TEAM_CONFIG.vert.userIds.includes(userId as any)) return "vert";
  if (TEAM_CONFIG.bleu.userIds.includes(userId as any)) return "bleu";
  return null;
}

export function getTeamBadge(userId: string): "🟢" | "🔵" | null {
  const k = getTeamKey(userId);
  return k === "vert" ? "🟢" : k === "bleu" ? "🔵" : null;
}

export function isTeamPeriodActive(now: Date): boolean {
  const from = new Date(TEAM_CONFIG.active.from);
  const to = new Date(TEAM_CONFIG.active.to + "T23:59:59");
  return now >= from && now <= to;
}

/** Classes de coloration de l'encart d'un user (thème CLAIR : dashboard/assiduité). */
export function getTeamRowClass(userId: string): string {
  const k = getTeamKey(userId);
  if (!k || !isTeamPeriodActive(new Date())) return "";
  return k === "vert"
    ? "border-l-4 border-green-400 bg-green-50/70"
    : "border-l-4 border-blue-400 bg-blue-50/70";
}

/** Classes de coloration de l'encart d'un user (thème SOMBRE : leaderboard). */
export function getTeamRowClassDark(userId: string): string {
  const k = getTeamKey(userId);
  if (!k || !isTeamPeriodActive(new Date())) return "";
  return k === "vert"
    ? "border-l-4 border-green-500 bg-green-500/10"
    : "border-l-4 border-blue-500 bg-blue-500/10";
}
