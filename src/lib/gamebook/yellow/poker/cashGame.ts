// src/lib/gamebook/yellow/poker/cashGame.ts
//
// Nexus — Poker CASH QUOTIDIEN vs les boss : logique PURE de l'économie des tapis et du CASINO.
// Chaque boss a un tapis « du jour » persistant (reset à minuit). À sa 1re partie du jour, la maison LUI DONNE un
// tapis = ton buy-in (cap) — UNE SEULE FOIS. Ce qu'un boss GAGNE persiste (il peut dépasser le cap) ; ce qu'il PERD
// n'est pas rendu. Un boss à 0 est RUINÉ (out pour la journée).
//
// VERROUS DU 20/10/2026 (Jacanon : +48 612 ⚡ en 15 parties, dont +38 674 le 19/10) :
//   1. plus de RECHARGE : un boss qui avait perdu n'est plus remis au cap à la partie suivante (la maison lui
//      redonnait son tapis à chaque partie → dons illimités, « Jamais plus que toi » n'était pas tenu) ;
//   2. PLAFOND NET QUOTIDIEN DU CASINO (décision Sartay : 10 000 ⚡) : poker cash, roulette, blackjack et tuto
//      confondus. Au-delà, l'excédent est repris (« la maison plafonne ») et le croupier refuse l'assise jusqu'à
//      demain. Les pertes comptent en négatif : perdre 5 000 puis regagner 15 000 reste dans le plafond ;
//   3. le buy-in est DÉBITÉ à l'assise (DailyPokerPanel) : quitter sans encaisser ne « rembourse » plus la perte ;
//   4. BLINDES INDEXÉES SUR LA JAUGE (décision Sartay) : 2 BB par tranche de 1 000 ⚡ de jauge (repsCap). Un joueur à
//      38 000 de jauge joue en 38/76 : il doit jouer gros — et peut perdre gros. Buy-in minimal 10 BB, conseillé 20 BB.

export const CASH_SEATS = 6 // toi + 5 boss

/** Gain NET maximal encaissable sur la maison par JOUR, tout casino confondu (Sartay 20/10/2026 : 10 000). */
export const CASINO_DAILY_NET_CAP = 10_000

/** Blindes du cash du jour selon la JAUGE du joueur (repsCap) : 2 BB par tranche de 1 000 ⚡, plancher 1/2.
 *  Un joueur sous plafond casino (vœu du génie) reste en 1/2 : sa mise est bornée. */
export function cashBlindsFor(gauge: number, restricted = false): { sb: number; bb: number } {
    if (restricted) return { sb: 1, bb: 2 }
    const bb = Math.max(2, 2 * Math.floor(Math.max(0, Math.floor(gauge || 0)) / 1000))
    return { sb: Math.max(1, Math.floor(bb / 2)), bb }
}
export const MIN_BUYIN_BB = 10
export const DEFAULT_BUYIN_BB = 20
/** Bornes de buy-in pour des blindes données : minimum 10 BB, conseillé 20 BB. */
export function cashBuyinBounds(bb: number): { min: number; def: number } {
    const b = Math.max(2, Math.floor(bb))
    return { min: MIN_BUYIN_BB * b, def: DEFAULT_BUYIN_BB * b }
}

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
export function cashAllowanceLeft(netToday: number, cap = CASINO_DAILY_NET_CAP): number {
    return Math.max(0, Math.floor(cap) - Math.floor(netToday || 0))
}

/** Règlement d'un résultat NET contre la maison. Une perte est entière ; un gain est borné par la marge du jour,
 *  l'excédent est REPRIS par la maison (`taken`). `credit` = net à appliquer (signé) ; `netToday` mis à jour. */
export function settleDailyCashout(net: number, netToday: number, cap = CASINO_DAILY_NET_CAP): { credit: number; taken: number; netToday: number } {
    const n = Math.floor(net || 0), before = Math.floor(netToday || 0)
    if (n <= 0) return { credit: n, taken: 0, netToday: before + n }
    const credit = Math.min(n, cashAllowanceLeft(before, cap))
    return { credit, taken: n - credit, netToday: before + credit }
}
