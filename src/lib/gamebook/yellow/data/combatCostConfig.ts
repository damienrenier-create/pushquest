// src/lib/gamebook/yellow/data/combatCostConfig.ts
//
// Nexus Jaune Éclair — COÛT EN REPS des attaques (config, éditable).
// Les PP sont illimités : la vraie limite est le portefeuille de reps du joueur.
// Coût basé sur la PUISSANCE de l'attaque (faible = bon marché, forte = chère),
// SANS rampe de niveau (le coût ne dépend QUE de l'attaque) :
//   coût = max(1, arrondi( (puissance − FLOOR) / DIV ))
// Calibré : Charge (puiss 40) → 1 rep · Hydrocanon (puiss 110) → 10 reps.
// Les attaques de statut (puiss 0) coûtent 1.

export const MOVE_COST_POWER_FLOOR = 30 // puissance "offerte" avant de payer
export const MOVE_COST_POWER_DIV = 8    // points de puissance par rep

/** Coût en reps d'une attaque, selon sa PUISSANCE (indépendant du niveau). */
export function moveCostReps(power: number): number {
    return Math.max(1, Math.round((Math.max(0, power) - MOVE_COST_POWER_FLOOR) / MOVE_COST_POWER_DIV))
}

/** Id de l'attaque de secours gratuite (anti soft-lock : faible + dégâts à soi). */
export const STRUGGLE_MOVE_ID = "charge_desesperee"

/** moveIndex sentinelle (hors plage des 4 slots) signalant la Charge Désespérée. */
export const STRUGGLE_INDEX = -1
