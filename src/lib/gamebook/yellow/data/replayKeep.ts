// src/lib/gamebook/yellow/data/replayKeep.ts
//
// REJEU — ce que le joueur RAMÈNE dans son vrai monde en sortant d'un rejeu du run 1 ou du run 3 (le rejeu du run 2 est
// additif : tout revient au PC, cf. saveManager.exitReplay). Règle de Sartay (28/10/2026) : 1 Daemon DE SON CHOIX par
// badge gagné dans le rejeu, PLUS tous ses SHINYS (d'office, hors quota) ; s'il a battu la Ligue dans le rejeu, il les
// ramène TOUS. (Avant : autant de Daemons au choix que de badges, +1 si Ligue battue, shinys compris.)
// Module PUR — lu par la sortie de rejeu (YellowDevClient).

import type { MonInstance } from "../battle/types"

export interface ReplayKeepPlan {
    /** Ramenés d'office : les shinys, ou toute l'équipe et tout le PC si la Ligue est battue. */
    auto: MonInstance[]
    /** Ceux parmi lesquels le joueur choisit (jamais un shiny, déjà ramené). Vide si tout revient. */
    choosable: MonInstance[]
    /** Nombre de Daemons à choisir dans `choosable` : 1 par badge, borné à ce qui est disponible. */
    max: number
}

/** Plan de sortie d'un rejeu du run 1 ou 3 : `mons` = équipe + PC de la bulle. */
export function replayKeepPlan(mons: readonly MonInstance[], badges: number, leagueBeaten: boolean): ReplayKeepPlan {
    if (leagueBeaten) return { auto: [...mons], choosable: [], max: 0 }
    const auto = mons.filter((m) => m.shiny)
    const choosable = mons.filter((m) => !m.shiny)
    return { auto, choosable, max: Math.max(0, Math.min(badges, choosable.length)) }
}

/** uid RÉELLEMENT unique pour chaque Daemon ramené (horodatage de la sortie + index) → aucune collision entre deux
 *  rejeux, ni avec le vrai monde (un même uid dans deux boîtes ferait perdre un Daemon à l'échange). */
export function retagKept(mons: readonly MonInstance[], stamp: number): MonInstance[] {
    return mons.map((m, i) => ({ ...m, uid: `bis-${stamp}-${i}-${m.uid}` }))
}
