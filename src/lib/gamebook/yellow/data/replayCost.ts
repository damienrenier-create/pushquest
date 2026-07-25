// src/lib/gamebook/yellow/data/replayCost.ts
//
// REJEU (« run bis ») — COÛT en Jetons de Combat, CROISSANT avec le nombre de rejeux déjà lancés. Compteur GLOBAL
// (tous runs confondus), stocké côté serveur dans FrontierProfile.replaysUsed (robuste : survit aux 3 mondes + fusion).
// Le 1er rejeu est GRATUIT. Barème (choix Sartay 25/07) : 0 · 500 · 1200 · 2500 · 5000 · puis +5000 par rejeu.
// Frein anti-farm du « ramener des Daemons » : rejouer en boucle coûte de plus en plus cher.

export const REPLAY_JC_COSTS = [0, 500, 1200, 2500, 5000] as const

/** Coût JC du PROCHAIN rejeu, sachant `replaysUsed` rejeux déjà lancés (0 → gratuit). */
export function replayCost(replaysUsed: number): number {
    const n = Math.max(0, Math.floor(replaysUsed || 0))
    if (n < REPLAY_JC_COSTS.length) return REPLAY_JC_COSTS[n]
    return REPLAY_JC_COSTS[REPLAY_JC_COSTS.length - 1] + (n - REPLAY_JC_COSTS.length + 1) * 5000
}
