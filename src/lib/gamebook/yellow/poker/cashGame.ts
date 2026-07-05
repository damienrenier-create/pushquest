// src/lib/gamebook/yellow/poker/cashGame.ts
//
// Nexus — Poker CASH QUOTIDIEN vs les boss : logique PURE de l'économie des tapis.
// Chaque boss a un tapis « du jour » persistant (reset à minuit). À la 1re partie du jour, la maison
// LEUR DONNE un tapis = ton buy-in (cap). Ce qu'un boss GAGNE persiste (il peut dépasser le cap). Un boss
// à 0 est RUINÉ (out pour la journée). Jamais plus que toi via les DONS ; ses gains restent acquis.

export const CASH_SEATS = 6 // toi + 5 boss

/** Tapis de départ d'un boss pour une nouvelle partie cash (cap = ton buy-in du jour) :
 *  - null              → RUINÉ aujourd'hui (stored === 0) → ne s'assoit PAS.
 *  - cap               → nouveau boss du jour (jamais vu) : don initial, capé sur toi.
 *  - max(stored, cap)  → boss connu : RECHARGÉ au cap s'il avait perdu, GARDE ses gains s'il avait gagné. */
export function bossStartStack(stored: number | undefined, cap: number): number | null {
    if (stored === 0) return null
    const c = Math.max(1, Math.floor(cap))
    if (stored === undefined) return c
    return Math.max(Math.floor(stored), c)
}
