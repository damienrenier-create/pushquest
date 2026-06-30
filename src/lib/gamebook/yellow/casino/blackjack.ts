// src/lib/gamebook/yellow/casino/blackjack.ts
//
// Nexus Jaune Éclair — BLACKJACK (21) au casino. Moteur 100% PUR (aucune dépendance UI/DB) : l'état du
// jeu + les transitions (distribuer / tirer / rester / doubler / jeu du croupier / règlement). Le RNG du
// sabot est INJECTÉ (testable, déterministe). Règles : croupier tire jusqu'à 16 et reste à 17 (soft
// inclus) ; blackjack naturel payé 3:2 ; égalité = remboursée ; double = +1 carte puis stop.

export interface Card { rank: number; suit: number } // rank 1..13 (1=As, 11=V, 12=D, 13=R) · suit 0..3 (cosmétique)
export type BJPhase = "player" | "done"
export type BJOutcome = "blackjack" | "win" | "push" | "lose"

export interface BJState {
    deck: Card[]        // sabot restant
    player: Card[]
    dealer: Card[]
    bet: number         // mise TOTALE engagée (×2 si doublé)
    doubled: boolean
    phase: BJPhase
    outcome: BJOutcome | null
    payout: number      // à CRÉDITER en fin (mise remboursée + gain ; 0 si perdu)
    net: number         // gain NET = payout - bet (négatif si perte)
}

/** Valeur d'une main : figures = 10, As = 11 réduit à 1 tant qu'on dépasse 21. */
export function handValue(cards: Card[]): number {
    let total = 0, aces = 0
    for (const c of cards) {
        if (c.rank === 1) { aces++; total += 11 }
        else total += c.rank >= 10 ? 10 : c.rank
    }
    while (total > 21 && aces > 0) { total -= 10; aces-- }
    return total
}

/** Blackjack NATUREL : 21 avec exactement 2 cartes. */
export function isBlackjack(cards: Card[]): boolean {
    return cards.length === 2 && handValue(cards) === 21
}

/** Sabot mélangé (Fisher-Yates avec RNG injecté). `decks` jeux de 52 cartes. */
export function freshShoe(rng: () => number, decks = 4): Card[] {
    const cards: Card[] = []
    for (let d = 0; d < decks; d++) for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) cards.push({ rank: r, suit: s })
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        const t = cards[i]; cards[i] = cards[j]; cards[j] = t
    }
    return cards
}

/** Le croupier tire jusqu'à atteindre 17 (reste à 17, soft inclus). */
function dealerPlay(s: BJState): BJState {
    const deck = [...s.deck], dealer = [...s.dealer]
    while (handValue(dealer) < 17 && deck.length > 0) dealer.push(deck.pop() as Card)
    return { ...s, deck, dealer }
}

/** Règle la main (compare joueur/croupier) → phase "done", outcome + payout + net. */
function settle(s: BJState): BJState {
    const pv = handValue(s.player), dv = handValue(s.dealer)
    const pbj = isBlackjack(s.player), dbj = isBlackjack(s.dealer)
    let outcome: BJOutcome, payout: number
    if (pv > 21) { outcome = "lose"; payout = 0 }                                  // joueur saute
    else if (pbj && !dbj) { outcome = "blackjack"; payout = s.bet + Math.floor(s.bet * 1.5) } // 3:2
    else if (pbj && dbj) { outcome = "push"; payout = s.bet }                      // deux blackjacks
    else if (dbj) { outcome = "lose"; payout = 0 }                                 // croupier blackjack
    else if (dv > 21 || pv > dv) { outcome = "win"; payout = s.bet * 2 }           // croupier saute / joueur devant
    else if (pv === dv) { outcome = "push"; payout = s.bet }                       // égalité
    else { outcome = "lose"; payout = 0 }                                          // croupier devant
    return { ...s, phase: "done", outcome, payout, net: payout - s.bet }
}

/** Distribue une nouvelle main : 2 cartes joueur + 2 croupier. Si blackjack naturel → réglé direct
 *  (sans tirage du croupier : 3:2, ou push si le croupier a aussi blackjack). */
export function deal(deck: Card[], bet: number): BJState {
    const d = [...deck]
    const player = [d.pop() as Card, d.pop() as Card]
    const dealer = [d.pop() as Card, d.pop() as Card]
    const s: BJState = { deck: d, player, dealer, bet, doubled: false, phase: "player", outcome: null, payout: 0, net: 0 }
    return isBlackjack(player) || isBlackjack(dealer) ? settle(s) : s // BJ naturel d'un côté → réglé direct
}

/** TIRER une carte. Bust (>21) → réglé (perte) ; 21 → on s'arrête et le croupier joue. */
export function hit(s: BJState): BJState {
    if (s.phase !== "player") return s
    const deck = [...s.deck], player = [...s.player]
    player.push(deck.pop() as Card)
    const ns: BJState = { ...s, deck, player }
    if (handValue(player) > 21) return settle(ns)        // saute → perdu (pas besoin que le croupier joue)
    if (handValue(player) === 21) return settle(dealerPlay(ns)) // 21 → stop auto, le croupier joue
    return ns
}

/** RESTER : le croupier joue, puis règlement. */
export function stand(s: BJState): BJState {
    if (s.phase !== "player") return s
    return settle(dealerPlay(s))
}

/** DOUBLER : uniquement sur la main initiale (2 cartes). Double la mise, tire EXACTEMENT 1 carte, puis
 *  le croupier joue. (Le caller doit avoir débité la mise supplémentaire.) */
export function double(s: BJState): BJState {
    if (s.phase !== "player" || s.player.length !== 2) return s
    const deck = [...s.deck], player = [...s.player]
    player.push(deck.pop() as Card)
    const ns: BJState = { ...s, deck, player, bet: s.bet * 2, doubled: true }
    return handValue(player) > 21 ? settle(ns) : settle(dealerPlay(ns))
}

/** Peut-on doubler ? (main initiale de 2 cartes, phase joueur). */
export function canDouble(s: BJState): boolean {
    return s.phase === "player" && s.player.length === 2
}
