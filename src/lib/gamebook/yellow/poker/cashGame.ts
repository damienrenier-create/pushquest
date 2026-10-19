// src/lib/gamebook/yellow/poker/cashGame.ts
//
// Nexus — Poker CASH QUOTIDIEN vs les boss : logique PURE de l'économie des tapis.
// Chaque boss a un tapis « du jour » persistant (reset à minuit). À sa 1re partie du jour, la maison LUI DONNE un
// tapis = ton buy-in (cap) — UNE SEULE FOIS. Ce qu'un boss GAGNE persiste (il peut dépasser le cap) ; ce qu'il PERD
// n'est pas rendu. Un boss à 0 est RUINÉ (out pour la journée).
//
// VERROUS DU 20/10/2026 (Jacanon : +48 612 ⚡ en 15 parties, dont +38 674 le 19/10) :
//   1. plus de RECHARGE : un boss qui avait perdu n'est plus remis au cap à la partie suivante (la maison lui
//      redonnait son tapis à chaque partie → dons illimités, « Jamais plus que toi » n'était pas tenu) ;
//   2. PLAFOND NET QUOTIDIEN : au-delà de +POKER_DAILY_NET_CAP ⚡ net gagnés à la maison sur la journée, l'excédent
//      est repris (« la maison plafonne », comme le tuto) et le croupier refuse une nouvelle assise jusqu'à demain.
//      Les pertes comptent en négatif : perdre 500 puis regagner 1 500 reste dans le plafond ;
//   3. le buy-in est DÉBITÉ à l'assise (DailyPokerPanel) : quitter sans encaisser ne « rembourse » plus la perte.

export const CASH_SEATS = 6 // toi + 5 boss

/** Gain NET maximal encaissable sur la maison par JOUR (aligné sur le plafond du tuto, FIRST_GAME_CHEAT_CAP). */
export const POKER_DAILY_NET_CAP = 1000

/** Tapis de départ d'un boss pour une nouvelle partie cash (cap = ton buy-in du jour) :
 *  - null    → RUINÉ aujourd'hui (stored === 0) → ne s'assoit PAS.
 *  - cap     → nouveau boss du jour (jamais vu) : don initial, capé sur toi.
 *  - stored  → boss connu : il repart avec CE QU'IL A (ses gains comme ses pertes) — jamais rechargé. */
export function bossStartStack(stored: number | undefined, cap: number): number | null {
    if (stored === 0) return null
    const c = Math.max(1, Math.floor(cap))
    if (stored === undefined) return c
    return Math.max(1, Math.floor(stored))
}

/** Ce qu'il reste à gagner aujourd'hui (≥ 0) : plafond − net déjà encaissé (un net négatif rend de la marge). */
export function cashAllowanceLeft(netToday: number, cap = POKER_DAILY_NET_CAP): number {
    return Math.max(0, Math.floor(cap) - Math.floor(netToday || 0))
}

/** Règlement d'une sortie : `net` = tapis final − buy-in. Une perte est entière ; un gain est borné par la marge du
 *  jour, l'excédent est REPRIS par la maison (`taken`). `credit` = net à appliquer (signé) ; `netToday` mis à jour. */
export function settleDailyCashout(net: number, netToday: number, cap = POKER_DAILY_NET_CAP): { credit: number; taken: number; netToday: number } {
    const n = Math.floor(net || 0), before = Math.floor(netToday || 0)
    if (n <= 0) return { credit: n, taken: 0, netToday: before + n }
    const credit = Math.min(n, cashAllowanceLeft(before, cap))
    return { credit, taken: n - credit, netToday: before + credit }
}
