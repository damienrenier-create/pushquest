// src/lib/gamebook/yellow/battle/fusionXp.ts
//
// LIGUE DE FUSION — reversement d'XP aux PARENTS. Les fusionnés du joueur sont ÉPHÉMÈRES (jetés en fin de combat) :
// sans ce mécanisme, les combats de Ligue ne feraient JAMAIS progresser les vrais Daemons. À la fin de chaque combat
// de Ligue, chaque fusionné reverse la MOITIÉ de l'XP qu'il a gagnée à ses 2 PARENTS.
//   • OPTION A (décision Sartay) : CHAQUE parent reçoit cette moitié (le duo progresse comme un Daemon normal).
//   • Cumulé sur la venue (crédit par combat) ; un fusionné KO a gagné son XP jusqu'à sa chute → crédité pareil.
// MODULE PUR : ne persiste rien, ne lit aucun store. Renvoie les clones édités (à écrire par l'appelant) + le résumé.

import type { MonInstance } from "./types"
import { applyExp } from "./xp"
import { maxHpOf } from "./engine"
import { getSpecies } from "../data/species"

export interface FusionXpResult {
    /** uid parent → clone crédité (level-up/XP/PV/attaques appliqués). L'appelant les écrit dans équipe/boîte. */
    edited: Map<string, MonInstance>
    /** Résumé des montées de niveau (pour la notification), ex. « Bidouzen N40→42 ». */
    grew: string[]
}

const parentLabel = (m: MonInstance) => m.nickname?.trim() || getSpecies(m.speciesId)?.name || m.speciesId

/**
 * Reverse la moitié de l'XP de chaque fusionné à ses 2 parents (option A). `findParent` résout un uid → le Daemon
 * RÉEL du roster (équipe ∪ boîte) ou undefined (parent relâché/échangé depuis l'assemblage → simplement sauté).
 * Chaque parent n'est crédité qu'UNE fois par combat (l'Atelier interdit déjà un Daemon dans 2 fusions).
 */
export function creditFusionParents(
    fusionTeam: ReadonlyArray<Pick<MonInstance, "uid" | "fusionParents">>,
    xpByUid: Record<string, number> | undefined,
    findParent: (uid: string) => MonInstance | undefined,
): FusionXpResult {
    const edited = new Map<string, MonInstance>()
    const grew: string[] = []
    for (const fusion of fusionTeam) {
        const parents = fusion.fusionParents
        if (!parents) continue
        const half = Math.floor((xpByUid?.[fusion.uid] ?? 0) / 2)
        if (half <= 0) continue
        for (const puid of parents) {
            if (edited.has(puid)) continue // déjà crédité ce combat (invariant Atelier : 1 Daemon = 1 seule fusion) → jamais 2×
            const orig = findParent(puid)
            if (!orig) continue // parent relâché/échangé depuis l'assemblage → on saute
            const clone: MonInstance = { ...orig, moves: orig.moves.map((x) => ({ ...x })), pendingMoves: orig.pendingMoves ? [...orig.pendingMoves] : undefined } // clone défensif (applyExp mute l'instance + pousse dans moves/pendingMoves) — idiome maison playerStore
            const beforeMax = maxHpOf(clone)
            const res = applyExp(clone, half)
            if (res.toLevel > res.fromLevel) {
                const delta = maxHpOf(clone) - beforeMax
                if (delta > 0) clone.currentHp = Math.min(maxHpOf(clone), clone.currentHp + delta) // gagne le delta de PV, comme un level-up en combat
                grew.push(`${parentLabel(clone)} N${res.fromLevel}→${res.toLevel}`)
            }
            edited.set(puid, clone)
        }
    }
    return { edited, grew }
}
