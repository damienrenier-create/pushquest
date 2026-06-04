// src/lib/gamebook/yellow/data/saiyanConfig.ts
//
// Nexus Jaune Éclair — ENTRAÎNEMENT SAIYAN (allocation libre de stats).
// COUCHE ADDITIVE par-dessus la formule Gen-1 : 0 point alloué = comportement
// d'origine intact. À chaque montée de niveau, le Daemon gagne des points que le
// joueur répartit où il veut (atk/def/spe/spc/hp) → builds "glass cannon", tank…
//
// Conservateur volontairement (1 pt/niveau) pour ne pas casser l'équilibre.
// Tout est ici pour être tuné facilement.

import type { StatKey } from "../battle/types"

/** Points d'entraînement gagnés à chaque niveau gagné. */
export const SAIYAN_POINTS_PER_LEVEL = 1

/** Valeur ajoutée par point dépensé, selon la stat (les PV scalent plus gros). */
export const SAIYAN_POINT_VALUE: Record<StatKey, number> = {
    hp: 3,
    atk: 1,
    def: 1,
    spe: 1,
    spc: 1,
}

/** Bonus à plat apporté par les points alloués sur une stat donnée. */
export function allocatedBonus(stat: StatKey, points: number): number {
    return Math.max(0, Math.floor(points)) * SAIYAN_POINT_VALUE[stat]
}
