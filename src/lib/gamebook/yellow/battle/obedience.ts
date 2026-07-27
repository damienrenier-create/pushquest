// src/lib/gamebook/yellow/battle/obedience.ts
//
// OBÉISSANCE (façon Gen 1, étendue) : un Daemon peut DÉSOBÉIR si son niveau dépasse un cap lié au nombre de
// BADGES du joueur. DEUX barèmes selon l'ORIGINE du Daemon :
//   - À SOI (élevé/capturé) : STRICT — 0→20 · 1→30 · 2→40 · 3→50 · 4→65 · 5→100. Colle à la progression des
//     arènes → on ne peut pas sur-monter son équipe très au-dessus du contenu.
//   - ÉCHANGÉ (reçu d'un pote) : PERMISSIF (barème historique) — 0→20 · 1→35 · 2→50 · 3→65 · 4→80 · 5→100.
// Ne s'applique QU'en PvE (jamais en PvP miroir). La règle est expliquée en jeu par la Sbire du dieu Spaghetti.

export const MAX_OBEDIENCE_BADGES = 5

/** Plafond d'obéissance des Daemons À SOI (élevés/capturés). Plus strict que les échangés. */
const OWNED_CAPS = [20, 30, 40, 50, 65] as const
export function obedienceCapOwned(badges: number): number {
    if (badges >= MAX_OBEDIENCE_BADGES) return 100
    return OWNED_CAPS[Math.max(0, Math.min(OWNED_CAPS.length - 1, Math.floor(badges)))]
}

/** Plafond d'obéissance des Daemons ÉCHANGÉS (reçus d'un autre joueur). Barème historique, plus permissif. */
export function obedienceCapTraded(badges: number): number {
    if (badges >= MAX_OBEDIENCE_BADGES) return 100
    return 20 + Math.max(0, Math.floor(badges)) * 15
}

/** Plafond d'obéissance selon l'ORIGINE du Daemon (échangé = permissif, à soi = strict). */
export function obedienceCap(traded: boolean | undefined, badges: number): number {
    return traded === true ? obedienceCapTraded(badges) : obedienceCapOwned(badges)
}

/** Proba (0..100) de désobéir à un ordre : ~4 % par niveau AU-DESSUS du cap, plafonné à 50 %. */
export function disobeyChance(level: number, cap: number): number {
    return Math.min(50, Math.max(0, Math.floor(level - cap) * 4))
}

/** Un Daemon doit-il tester la désobéissance ? (au-dessus de son cap, selon son origine). PvE only. */
export function mayDisobey(traded: boolean | undefined, level: number, badges: number): boolean {
    return level > obedienceCap(traded, badges)
}
