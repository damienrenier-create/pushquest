// src/lib/gamebook/yellow/data/combatCostConfig.ts
//
// Nexus Jaune Éclair — COÛT EN REPS des attaques (config, éditable).
// Les PP sont illimités : la vraie limite est le portefeuille de reps du joueur.
// Coût = arrondi_sup( (C / pp_max) × (1 + niveau / N) ), minimum 1.
//   - PP faible (attaque forte) → coût ↑
//   - niveau élevé → coût ↑

export const MOVE_COST_PP_WEIGHT = 50  // C : poids du PP (PP bas = cher)
export const MOVE_COST_LEVEL_DIV = 25  // N : poids du niveau

/** Coût en reps d'une attaque, selon son PP d'origine et le niveau du Daemon. */
export function moveCostReps(ppMax: number, level: number): number {
    const pp = Math.max(1, ppMax)
    const lvl = Math.max(1, level)
    const raw = (MOVE_COST_PP_WEIGHT / pp) * (1 + lvl / MOVE_COST_LEVEL_DIV)
    return Math.max(1, Math.ceil(raw))
}

/** Id de l'attaque de secours gratuite (anti soft-lock : faible + dégâts à soi). */
export const STRUGGLE_MOVE_ID = "charge_desesperee"

/** moveIndex sentinelle (hors plage des 4 slots) signalant la Charge Désespérée. */
export const STRUGGLE_INDEX = -1
