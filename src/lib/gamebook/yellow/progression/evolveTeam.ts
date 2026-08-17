// src/lib/gamebook/yellow/progression/evolveTeam.ts
//
// Nexus Jaune Éclair — évolutions POST-COMBAT (comme Gen 1 : on évolue après le
// combat, pas pendant). React-free, pur. MUTE les instances de l'équipe, MAIS
// renvoie un SNAPSHOT pré-évolution par Daemon → le joueur peut ANNULER (touche B)
// pendant la cinématique, ce qui restaure l'état d'avant (cf. cancelEvolution).

import type { MonInstance } from "../battle/types"
import { levelEvolutionTarget, applyEvolution, type EvolutionResult } from "../battle/evolution"
import { getSpecies } from "../data/species"

/** Une évolution effectuée sur un membre d'équipe + de quoi la défaire (annulation B). */
export interface TeamEvolution extends EvolutionResult {
    uid: string
    /** État AVANT l'évolution (pour restaurer si le joueur annule). */
    beforeSpeciesId: string
    beforeMoves: { moveId: string; pp: number; ppMax: number }[]
    beforePendingMoves: string[]
}

/**
 * Fait évoluer chaque membre de l'équipe dont le niveau atteint le palier.
 * Gère les chaînes d'évolution (ex. stade 1 → 2 → 3 en un seul combat).
 * Renvoie une entrée PAR Daemon évolué (from = forme pré-chaîne, to = forme finale)
 * avec le snapshot nécessaire à l'annulation.
 */
export function evolveTeam(team: MonInstance[]): TeamEvolution[] {
    const results: TeamEvolution[] = []
    for (const mon of team) {
        const beforeSpeciesId = mon.speciesId
        const beforeMoves = mon.moves.map((m) => ({ ...m }))
        const beforePendingMoves = [...(mon.pendingMoves ?? [])]

        let guard = 0
        let evolved = false
        let target = levelEvolutionTarget(mon)
        const learnedMoveIds: string[] = [], pendingMoveIds: string[] = [] // cumulés sur toute la chaîne d'évolution
        while (target && guard < 5) {
            const r = applyEvolution(mon, target)
            if (r) { evolved = true; learnedMoveIds.push(...(r.learnedMoveIds ?? [])); pendingMoveIds.push(...(r.pendingMoveIds ?? [])) }
            target = levelEvolutionTarget(mon)
            guard++
        }
        if (evolved) {
            results.push({
                uid: mon.uid,
                fromId: beforeSpeciesId,
                fromName: getSpecies(beforeSpeciesId)?.name ?? beforeSpeciesId,
                toId: mon.speciesId,
                toName: getSpecies(mon.speciesId)?.name ?? mon.speciesId,
                learnedMoveIds,
                pendingMoveIds,
                beforeSpeciesId,
                beforeMoves,
                beforePendingMoves,
            })
        }
    }
    return results
}
