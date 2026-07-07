// src/lib/gamebook/yellow/battle/obedience.ts
//
// OBÉISSANCE (façon Gen 1) : un Daemon ÉCHANGÉ (reçu d'un autre joueur, `traded`) peut DÉSOBÉIR si son
// niveau dépasse un cap déterminé par le nombre de BADGES du joueur. Anti-triche : impossible de se faire
// filer un Daemon surpuissant par un pote et tout roulcompresser sans avoir mérité les badges.
// Ne s'applique QU'en PvE (jamais en PvP miroir). Les Daemons capturés/élevés soi-même obéissent toujours.

export const MAX_OBEDIENCE_BADGES = 5

/** Niveau MAX qu'un Daemon échangé obéit sans risque, selon le nb de badges obtenus.
 *  0 badge → 20 · 1 → 35 · 2 → 50 · 3 → 65 · 4 → 80 · 5 (tous) → 100 (obéissance totale). */
export function obedienceCap(badges: number): number {
    if (badges >= MAX_OBEDIENCE_BADGES) return 100
    return 20 + Math.max(0, badges) * 15
}

/** Proba (0..100) de désobéir à un ordre : ~4 % par niveau AU-DESSUS du cap, plafonné à 50 %. */
export function disobeyChance(level: number, cap: number): number {
    return Math.min(50, Math.max(0, Math.floor(level - cap) * 4))
}

/** Un Daemon donné doit-il tester la désobéissance ? (échangé + au-dessus de son cap de badges). */
export function mayDisobey(traded: boolean | undefined, level: number, badges: number): boolean {
    return traded === true && level > obedienceCap(badges)
}
