// src/lib/gamebook/casinoBoost.ts
//
// v3.24b-6 — Boost/malus des croupiers du casino Vegas.
//
// 6 croupiers, 3 boosts (+5/+10/+15%) et 3 malus (-5/-10/-15%).
// Quand le joueur parle à un croupier (1×/jour, ne s'écrase pas si déjà
// parlé ce jour), un boost est armé. Au prochain pari (toute table Vegas),
// le payout est multiplié par (1 + boostPct/100) et le boost est consommé.

import { getTodayISO } from "@/lib/challenge"

export const CROUPIER_BOOSTS: Record<string, number> = {
    croupier_vitellino: +10,    // casino_a
    croupier_fettucci:  -10,    // casino_a
    croupier_gramigna:  +5,     // casino_b
    croupier_casarecci: -5,     // casino_b
    croupier_bavettone: +15,    // casino_c
    croupier_trofie:    -15,    // casino_c
}

/**
 * Lit le boost actif (si la date est aujourd'hui).
 * Retourne 0 si aucun boost armé.
 */
export function getActiveBoost(progress: { casinoBoostPctToday?: number; casinoBoostDate?: string } | null): number {
    if (!progress) return 0
    const today = getTodayISO()
    if (progress.casinoBoostDate !== today) return 0
    return progress.casinoBoostPctToday ?? 0
}

/**
 * Applique le boost au payout (gain brut). Retourne le payout ajusté.
 * Si boost positif et payout > 0 → augmente. Si boost négatif → diminue.
 * Si payout == 0 (perdu), aucun effet (les pertes ne sont pas modulées).
 */
export function applyBoostToPayout(payout: number, boostPct: number): number {
    if (payout <= 0 || boostPct === 0) return payout
    return Math.round(payout * (1 + boostPct / 100))
}

/**
 * Data partielle pour consommer le boost (= reset à 0).
 * À spreader dans le update Prisma.
 */
export function consumeBoostPatch(): { casinoBoostPctToday: number } {
    return { casinoBoostPctToday: 0 }
}
