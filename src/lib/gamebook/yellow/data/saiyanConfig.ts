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

/**
 * Contexte PushQuest pour la conversion des points Saiyan d'un Daemon.
 * - hadFine : au moins une amende reçue dans la fenêtre [dernier level-up → hier] (discipline brisée).
 * - quotaDoubled : quota STRICTEMENT dépassé HIER **et** AUJOURD'HUI (2 jours d'affilée, aujourd'hui inclus)
 *   → entraînement exemplaire soutenu = points DOUBLÉS. (Ancienne règle « chaque jour de la fenêtre » abandonnée :
 *   quasi inatteignable pour un joueur quotidien qui convertissait le jour même.)
 */
export interface SaiyanWindow {
    hadFine: boolean
    quotaDoubled: boolean
}

/**
 * Règle "inspirée des Saiyans" : combien de points par niveau gagné ?
 *   0 si une amende est tombée (discipline brisée),
 *   2 si le quota a été dépassé HIER ET AUJOURD'HUI (élan exemplaire → doublé),
 *   1 sinon (croissance normale).
 * Indéterminé / hors-ligne → traiter comme { hadFine:false, quotaDoubled:false } = 1/niveau.
 */
export function saiyanPointsPerLevel(w: SaiyanWindow): 0 | 1 | 2 {
    if (w.hadFine) return 0
    if (w.quotaDoubled) return 2
    return 1
}

/** Total de points pour N niveaux gagnés sur une même fenêtre. */
export function saiyanPointsForLevels(levelsGained: number, w: SaiyanWindow): number {
    return Math.max(0, Math.floor(levelsGained)) * saiyanPointsPerLevel(w)
}

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
