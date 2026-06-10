// src/lib/gamebook/yellow/data/combatCostConfig.ts
//
// Nexus Jaune Éclair — COÛT EN REPS des attaques (config, éditable).
// Les PP sont illimités : la vraie limite est le portefeuille de reps du joueur.
// Coût basé sur la PUISSANCE de l'attaque, PLAFONNÉ par la bande de niveau du Daemon
// (le niveau compte via un PLAFOND, pas un multiplicateur → ne monte plus trop vite) :
//   bande : niv ≤15 (0) · 16-30 (1) · 31+ (2)
//   attaque DÉGÂT  : coût = clamp( round((puiss−FLOOR)/DIV), 1, PLAFOND[bande] )
//   attaque STATUT : coût = STATUT[bande]
// Calibré : Charge (40) → 1 · Hydrocanon (110) → 5 (niv≤15) / 8 (16-30) / 10 (31+).
// Statut : 1 (niv≤15) / 2 (16-30) / 3 (31+).

export const MOVE_COST_POWER_FLOOR = 30 // puissance "offerte" avant de payer
export const MOVE_COST_POWER_DIV = 8    // points de puissance par rep
export const COST_LEVEL_BANDS = [15, 30] as const   // bornes hautes des bandes 0 et 1
export const COST_CAP_BY_BAND = [5, 8, 10] as const  // plafond du coût d'une attaque, par bande
export const STATUS_COST_BY_BAND = [1, 2, 3] as const // coût d'une attaque de statut, par bande

/** Bande de niveau (0 = ≤15, 1 = 16-30, 2 = 31+). */
function levelBand(level: number): 0 | 1 | 2 {
    return level <= COST_LEVEL_BANDS[0] ? 0 : level <= COST_LEVEL_BANDS[1] ? 1 : 2
}

/** Coût en reps d'une attaque, selon sa PUISSANCE + le niveau (via plafond/bande). */
export function moveCostReps(power: number, level: number): number {
    const band = levelBand(level)
    if (power <= 0) return STATUS_COST_BY_BAND[band] // attaque de statut
    const raw = Math.round((power - MOVE_COST_POWER_FLOOR) / MOVE_COST_POWER_DIV)
    return Math.max(1, Math.min(COST_CAP_BY_BAND[band], raw))
}

/** Id de l'attaque de secours gratuite (anti soft-lock : faible + dégâts à soi). */
export const STRUGGLE_MOVE_ID = "charge_desesperee"

/** moveIndex sentinelle (hors plage des 4 slots) signalant la Charge Désespérée. */
export const STRUGGLE_INDEX = -1
