// src/lib/gamebook/yellow/data/combatCostConfig.ts
//
// Nexus Jaune Éclair — COÛT EN REPS des attaques (config, éditable).
// Les PP sont illimités : la vraie limite est le portefeuille de reps du joueur.
//
// FORMULE UNIFIÉE (dégâts ET statuts) :
//   coût = round( 10 × (cp/100) × (quota/150) × (niveau/60) )   — chaque facteur plafonné à 1, min 1.
//   cp (« puissance de coût ») = PUISSANCE pour une attaque de dégâts ; PALIER d'impact pour un statut.
// → Pour atteindre 10 : puissance ≥100 ET quota ≥150 ET niveau ≥60.
//   Ex. Hydrocanon (110) niv60 : quota 150 → 10 · quota 30 → 2 · (à niv 30, c'est la moitié).
//   Statuts plafonnés par leur cp (move.costPower) : game-changer 50 → coût max 5 ; défaut 30 → 3 ; mineur 20 → 2.

import type { MoveData } from "../battle/types"

export const QUOTA_STD = 150        // quota étalon (cible reps IRL de référence)
export const LEVEL_STD = 60         // niveau étalon du Daemon (coût plein à partir de N60)
export const MAX_COST = 10          // coût maximum d'une attaque
export const STATUS_DEFAULT_CP = 30 // cp d'un statut non tagué (palier « notable » → coût max 3)

/** Quota effectif pour le coût : valeur brute si plausible (>1), sinon l'étalon 150 (hors-ligne / indispo). */
export function effectiveQuota(rawQuota: number | undefined | null): number {
    return rawQuota && rawQuota > 1 ? rawQuota : QUOTA_STD
}

/** « Puissance de coût » : la puissance (dégâts) ou le palier d'impact (statut, via costPower). */
function costPowerOf(move: MoveData): number {
    return move.power > 0 ? move.power : (move.costPower ?? STATUS_DEFAULT_CP)
}

/** Coût en reps d'une attaque, scalé par le QUOTA IRL du joueur ET le NIVEAU du Daemon (cf. en-tête). */
export function attackCost(move: MoveData | null, level: number, quota: number): number {
    if (!move) return 1
    const cp = costPowerOf(move)
    const f =
        Math.min(1, cp / 100) *
        Math.min(1, Math.max(0, quota) / QUOTA_STD) *
        Math.min(1, Math.max(0, level) / LEVEL_STD)
    return Math.max(1, Math.min(MAX_COST, Math.round(MAX_COST * f)))
}

/** Id de l'attaque de secours gratuite (anti soft-lock : faible + dégâts à soi). */
export const STRUGGLE_MOVE_ID = "charge_desesperee"

/** moveIndex sentinelle (hors plage des 4 slots) signalant la Charge Désespérée. */
export const STRUGGLE_INDEX = -1
