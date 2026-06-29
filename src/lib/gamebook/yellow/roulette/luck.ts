// src/lib/gamebook/yellow/roulette/luck.ts
//
// Nexus — Roulette : "jeton de chance" SECRET (potion barman ×4/×5). 100% PUR & testable
// (pas de prisma) → importé par le serveur. Le RIG ne s'applique QUE si le joueur est SEUL à parier
// sur la manche (vérifié côté serveur) ET reste PLAFONNÉ au prix payé (jamais de jackpot truqué).

import type { Bet } from "./bets"
import { resolveSpin } from "./engine"
import type { Rng } from "../battle/rng"

/** Jeton transmis avec la mise : type + plafond de gain (= prix payé pour la potion). */
export type RouletteLuck = { kind: "luck25" | "luckMax"; cap: number }

/** Parse défensif d'un jeton sérialisé (jamais throw). */
export function parseLuck(json: string | null): RouletteLuck | null {
    if (!json) return null
    try {
        const o = JSON.parse(json)
        if (o && (o.kind === "luck25" || o.kind === "luckMax") && typeof o.cap === "number" && o.cap > 0) {
            return { kind: o.kind, cap: Math.floor(o.cap) }
        }
    } catch { /* ignore */ }
    return null
}

/**
 * Choisit un numéro TRUQUÉ pour un joueur seul avec un jeton — ou null (= tirage normal).
 * SÉCURITÉ ANTI-JACKPOT : on ne retient QUE les numéros dont le gain NET ∈ ]0, cap]. Si AUCUNE issue
 * gagnante ne reste sous le plafond (grosse mise au gros payout), on renvoie null → l'aléatoire reprend.
 * Le gain truqué ne peut donc JAMAIS dépasser le prix de la potion.
 *  - luckMax (×5) : gain garanti (on prend le meilleur ≤ cap).
 *  - luck25 (×4)  : seulement 25 % du temps (rng injecté).
 */
export function selectRiggedWinning(bets: Bet[], luck: RouletteLuck, rng: Rng): number | null {
    let best = -1, bestNet = 0
    for (let n = 0; n <= 36; n++) {
        const net = resolveSpin(n, bets).net
        if (net > 0 && net <= luck.cap && net > bestNet) { bestNet = net; best = n }
    }
    if (best < 0) return null                                   // pas d'issue ≤ cap → tirage normal (anti-jackpot)
    if (luck.kind === "luck25" && !rng.chance(25)) return null  // ×4 : 25 % seulement
    return best
}
