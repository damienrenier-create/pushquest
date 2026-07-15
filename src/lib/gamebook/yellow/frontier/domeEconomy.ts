// src/lib/gamebook/yellow/frontier/domeEconomy.ts
//
// DÔME — ÉCONOMIE « poker » : mise LIBRE en énergie (bornée par les blinds du tier), remboursement selon la
// mise ET le classement (FAUCET-SAFE, ≤100 % : on récupère au mieux sa mise, jamais plus), et Jetons de Combat
// ∝ la mise (le VRAI profit). PUR & déterministe, aucune dépendance. Le câblage (débit énergie, route serveur
// anti-triche, UI de mise) se fait EN AVAL.

import type { DomeTier } from "./domeTypes"

/** Blinds (mise min/max en énergie) par tier — « les blinds montent avec le tier ». */
export const DOME_BLINDS: Record<DomeTier, { min: number; max: number }> = {
    BRONZE: { min: 5, max: 25 }, ARGENT: { min: 10, max: 75 }, OR: { min: 20, max: 150 }, DIAMANT: { min: 40, max: 300 },
    PLATINE: { min: 47, max: 375 }, MYTHIQUE: { min: 53, max: 440 }, MAITRE: { min: 60, max: 500 },
    // VOIE DU MAÎTRE : mises hautes (endgame) — mêmes blinds que Maître.
    DAN_1: { min: 60, max: 500 }, DAN_2: { min: 60, max: 500 }, DAN_3: { min: 60, max: 500 }, DAN_4: { min: 60, max: 500 },
}

/** Classement final dans le bracket de 8 : 1=1er, 2=2e, 3=demi-finaliste, 4=quart-finaliste ; 0=éliminé/forfait. */
export type DomePlacement = 1 | 2 | 3 | 4

/** Classement final : victoire → 1er ; sinon éliminé au round `roundLostAt` (0=quart→4e, 1=demi→3e, 2=finale→2e).
 *  Isolé + testé car il pilote le remboursement d'énergie RÉELLE (le point le plus sensible du Dôme). */
export function domeFinalPlacement(won: boolean, roundLostAt: number): DomePlacement {
    if (won) return 1
    return roundLostAt >= 2 ? 2 : roundLostAt === 1 ? 3 : 4
}

/** Borne la mise dans les blinds du tier ET la bourse disponible. Renvoie 0 si la bourse ne couvre même pas la
 *  mise MINIMALE du tier → l'appelant EN AVAL doit traiter 0 comme « ne peut pas miser » (interdit l'entrée/le débit). */
export function clampBet(bet: number, tier: DomeTier, available: number): number {
    const { min, max } = DOME_BLINDS[tier]
    const cap = Math.min(max, Math.floor(available))
    if (cap < min) return 0
    return Math.max(min, Math.min(cap, Math.floor(bet)))
}

/** % de la mise remboursé selon sa TAILLE : ~40 % (petite mise) → 100 % (500⚡+), linéaire borné. Aplati (plancher
 *  40 % au lieu de 1 %) pour que les petites mises ne soient plus un piège à 0 ⚡/0 JC. Modulé ensuite par le classement. */
export function sizePct(bet: number): number {
    return Math.max(40, Math.min(100, 40 + (60 * (Math.max(1, bet) - 1)) / 499))
}

const RANK_REFUND: Record<DomePlacement, number> = { 1: 1.0, 2: 0.7, 3: 0.5, 4: 0.25 }

/** Énergie remboursée (FAUCET-SAFE : ≤100 % de la mise, jamais de profit). 0 si éliminé/forfait. */
export function domeEnergyRefund(bet: number, placement: DomePlacement | 0): number {
    if (!placement) return 0
    const pct = Math.min(100, sizePct(bet) * RANK_REFUND[placement])
    return Math.min(bet, Math.floor((bet * pct) / 100))
}

// Taux de JC back-loadé : les petits tournois rapportent PEU (anti-farm), la vraie récolte est en haut de tableau.
const JC_RATE: Record<DomeTier, number> = { BRONZE: 0.05, ARGENT: 0.15, OR: 0.3, DIAMANT: 0.6, PLATINE: 0.73, MYTHIQUE: 0.86, MAITRE: 1.0, DAN_1: 1.1, DAN_2: 1.2, DAN_3: 1.35, DAN_4: 1.5 }
// JC ∝ MATCHS GAGNÉS. Placement 4 = éliminé au 1er tour (le quart, dans un bracket de 8) = 0 victoire → 0 JC :
// pas de « jeton de VICTOIRE » quand on perd son match d'entrée (l'énergie de mise est rendue à part, elle).
const RANK_JC: Record<DomePlacement, number> = { 1: 1.0, 2: 0.4, 3: 0.2, 4: 0 }

/** Jetons de Combat gagnés = mise × taux du tier × classement (le VRAI profit — plus tu mises, plus tu gagnes). */
export function domeJcReward(bet: number, tier: DomeTier, placement: DomePlacement | 0): number {
    if (!placement) return 0
    return Math.floor(bet * JC_RATE[tier] * RANK_JC[placement])
}
