// src/lib/gamebook/yellow/battle/obedience.ts
//
// OBÉISSANCE (façon Gen 1, étendue) : un Daemon peut DÉSOBÉIR si son niveau dépasse un cap lié au nombre de
// BADGES du joueur. DEUX barèmes selon l'ORIGINE du Daemon :
//   - À SOI (élevé/capturé) : STRICT — 0→20 · 1→30 · 2→40 · 3→50 · 4→55 · 5→65 · 6→100. Colle à la progression des
//     arènes → on ne peut pas sur-monter son équipe très au-dessus du contenu. (6 badges depuis le 21/10/2026 : le
//     bateau s'intercale ; les anciennes parties reçoivent son badge à la reprise → personne ne perd d'obéissance.)
//   - ÉCHANGÉ (reçu d'un pote) : PERMISSIF (barème historique) — 0→20 · 1→35 · 2→50 · 3→65 · 4→80 · 5→95 · 6→100.
//   - RUN 3 (concours), À SOI : RELEVÉ dès le 3ᵉ badge — 0→20 · 1→30 · 2→40 · 3→55 · 4→65 · 5→75 · 6→100. À badges égaux,
//     le bateau (≈ 46), l'Électrik (≈ 48) et l'Eau (≈ 62) y sont bien plus forts qu'au run 1 : on garde la même marge
//     qu'au run 1 (≈ 10 niveaux au-dessus du plus fort adversaire de l'étape). Demande Sartay du 21/10/2026.
// Ne s'applique QU'en PvE (jamais en PvP miroir). La règle est expliquée en jeu par la Sbire du dieu Spaghetti.

export const MAX_OBEDIENCE_BADGES = 6

/** Plafond d'obéissance des Daemons À SOI (élevés/capturés). Plus strict que les échangés. */
const OWNED_CAPS = [20, 30, 40, 50, 55, 65] as const
/** Même barème, relevé au RUN 3 (cf. en-tête). */
const OWNED_CAPS_RUN3 = [20, 30, 40, 55, 65, 75] as const
export function obedienceCapOwned(badges: number, run3 = false): number {
    if (badges >= MAX_OBEDIENCE_BADGES) return 100
    const caps = run3 ? OWNED_CAPS_RUN3 : OWNED_CAPS
    return caps[Math.max(0, Math.min(caps.length - 1, Math.floor(badges)))]
}

/** Plafond d'obéissance des Daemons ÉCHANGÉS (reçus d'un autre joueur). Barème historique, plus permissif. */
export function obedienceCapTraded(badges: number): number {
    if (badges >= MAX_OBEDIENCE_BADGES) return 100
    return 20 + Math.max(0, Math.floor(badges)) * 15
}

/** Plafond d'obéissance selon l'ORIGINE du Daemon (échangé = permissif, à soi = strict ; `run3` = barème relevé). */
export function obedienceCap(traded: boolean | undefined, badges: number, run3 = false): number {
    return traded === true ? obedienceCapTraded(badges) : obedienceCapOwned(badges, run3)
}

/** Proba (0..100) de désobéir à un ordre : ~4 % par niveau AU-DESSUS du cap, plafonné à 50 %. */
export function disobeyChance(level: number, cap: number): number {
    return Math.min(50, Math.max(0, Math.floor(level - cap) * 4))
}

/** Un Daemon doit-il tester la désobéissance ? (au-dessus de son cap, selon son origine). PvE only. */
export function mayDisobey(traded: boolean | undefined, level: number, badges: number, run3 = false): boolean {
    return level > obedienceCap(traded, badges, run3)
}
