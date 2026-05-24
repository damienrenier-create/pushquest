// ============================================================
// v3.24a — Système d'équipes pour le casino de Pépiteville
// ============================================================
// 7 joueurs sont répartis en 3 groupes :
//   - Équipe ROUGE  : Mools, Milkardashian, Neuneu
//   - Équipe JAUNE  : Xa, Embi, Gg
//   - Sans équipe   : Franss
//
// Chaque joueur en équipe peut réclamer +30 reps 1× par jour auprès du
// capitaine de sa couleur (PNJ situé près du casino de Bourg-Boulette).
// Les joueurs sans équipe sont accueillis mais ne reçoivent pas le bonus.
// ============================================================

export type Team = "RED" | "YELLOW" | "NONE"

/** Mapping userId → équipe. Source de vérité unique pour les attributions. */
export const TEAM_MEMBERSHIPS: Record<string, Team> = {
    // === Équipe ROUGE ===
    "cmml1r6um0000pto29d129npd": "RED",     // Mools
    "cmml1yb61000fpto2bxd8i6fc": "RED",     // Milkardashian
    "cmml1wvc00006k6aaxjjfsfv0": "RED",     // Neuneu
    // === Équipe JAUNE ===
    "cmml1xpeu001lk6aau4s8e70t": "YELLOW",  // Xa
    "cmml4dogn00005n1setjnfikl": "YELLOW",  // Embi
    "cmopr0pw6000a5ubrn11oedxk": "YELLOW",  // Gg
    // === Sans équipe ===
    "cmpgu4uq5000069du4s19q5l9": "NONE",    // Franss
}

/** Retourne l'équipe d'un user (NONE par défaut si pas mappé). */
export function getTeamForUser(userId: string): Team {
    return TEAM_MEMBERSHIPS[userId] ?? "NONE"
}

/** Couleur d'affichage pour l'UI (text/background). */
export function teamColor(team: Team): string {
    if (team === "RED") return "#e74c3c"
    if (team === "YELLOW") return "#f1c40f"
    return "#999"
}

/** Emoji pour l'UI. */
export function teamEmoji(team: Team): string {
    if (team === "RED") return "🔴"
    if (team === "YELLOW") return "🟡"
    return "⚪"
}

/** Label FR pour l'UI. */
export function teamLabel(team: Team): string {
    if (team === "RED") return "Équipe Rouge"
    if (team === "YELLOW") return "Équipe Jaune"
    return "Sans équipe"
}

/** Bonus quotidien d'un capitaine d'équipe (reps offerts 1×/jour). */
export const TEAM_CAPTAIN_BONUS_REPS = 30
