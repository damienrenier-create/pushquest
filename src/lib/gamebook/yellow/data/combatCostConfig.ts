// src/lib/gamebook/yellow/data/combatCostConfig.ts
//
// Nexus Jaune Éclair — COÛT EN REPS des attaques (config, éditable).
// Les PP sont illimités : la vraie limite est le portefeuille de reps du joueur.
//
// FORMULE UNIFIÉE (dégâts ET statuts) :
//   coût = round( 10 × (cp/100) × (quota/150) × (niveau/60) )   — chaque facteur plafonné à 1, min 1.
//   cp (« puissance de coût ») = pour une attaque de dégâts : PUISSANCE × nb MOYEN de coups (+ valeur du
//   drain si vol de PV) ; pour un statut : PALIER d'impact (move.costPower).
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

/**
 * « Puissance de coût » : reflète la VALEUR RÉELLE de l'attaque, pas juste sa puissance de base.
 * - Attaque de dégâts : puissance × NOMBRE MOYEN de coups (multi-hit) + la valeur du SOIN (drain).
 * - Statut : palier d'impact (move.costPower, défaut STATUS_DEFAULT_CP).
 */
/** SOURCE UNIQUE de la courbe de puissance « lowHp » (Patience) : puissance EFFECTIVE selon la fraction de PV
 *  de l'attaquant. Réutilisée par engine.ts (lowHpPower délègue ici) → dégâts ET coût en reps toujours alignés. */
export function lowHpPowerFrac(frac: number): number {
    if (frac >= 0.69) return 40
    if (frac >= 0.35) return 80
    if (frac >= 0.20) return 100
    if (frac >= 0.10) return 130
    return 150
}

function costPowerOf(move: MoveData, hpFrac?: number): number {
    if (move.power > 0) {
        const e = move.effect
        // Puissance dynamique (Patience) : on facture la puissance EFFECTIVE (jusqu'à 150) quand on connaît
        // les PV de l'attaquant — sinon repli sur la puissance de base (ex. côté ennemi, qui ne paie pas de reps).
        const base = e?.dynamicPower === "lowHp" && hpFrac !== undefined ? lowHpPowerFrac(hpFrac) : move.power
        const avgHits = e?.multiHit ? (e.multiHit[0] + e.multiHit[1]) / 2 : 1
        let cp = base * avgHits
        if (e?.drainPct) cp += (base * e.drainPct) / 100 // vol de PV → on paie aussi le soin rendu
        return cp
    }
    return move.costPower ?? STATUS_DEFAULT_CP
}

/** Coût en reps d'une attaque, scalé par le QUOTA IRL du joueur ET le NIVEAU du Daemon (cf. en-tête).
 *  `hpFrac` (optionnel) = fraction de PV de l'attaquant, pour les moves à puissance dynamique (Patience). */
export function attackCost(move: MoveData | null, level: number, quota: number, hpFrac?: number): number {
    if (!move) return 1
    const cp = costPowerOf(move, hpFrac)
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
