// src/lib/gamebook/yellow/progression/evolveTeam.ts
//
// Nexus Jaune Éclair — évolutions POST-COMBAT (comme Gen 1 : on évolue après le
// combat, pas pendant). React-free, pur. MUTE les instances de l'équipe.

import type { MonInstance } from "../battle/types"
import { levelEvolutionTarget, applyEvolution, type EvolutionResult } from "../battle/evolution"

/**
 * Fait évoluer chaque membre de l'équipe dont le niveau atteint le palier.
 * Gère les chaînes d'évolution (ex. stade 1 → 2 → 3 en un seul combat).
 * Renvoie la liste des évolutions effectuées (pour l'UI).
 */
export function evolveTeam(team: MonInstance[]): EvolutionResult[] {
    const results: EvolutionResult[] = []
    for (const mon of team) {
        let guard = 0
        let target = levelEvolutionTarget(mon)
        while (target && guard < 5) {
            const r = applyEvolution(mon, target)
            if (r) results.push(r)
            target = levelEvolutionTarget(mon)
            guard++
        }
    }
    return results
}
