// src/lib/gamebook/yellow/poker/cashGame.ts
//
// Nexus — Poker CASH QUOTIDIEN vs les boss : logique PURE de l'économie des tapis et du CASINO.
// Chaque boss a un tapis « du jour » persistant (reset à minuit UTC). À sa 1re partie du jour, la maison LUI DONNE le
// tapis du MENU DU JOUR (cap) — UNE SEULE FOIS. Ce qu'un boss GAGNE persiste (il peut dépasser le cap) ; ce qu'il PERD
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
//      38 000 de jauge joue en 38/76 : il doit jouer gros — et peut perdre gros. Buy-in minimal 10 BB, conseillé 20 BB ;
//   5. MENU DE LA SEMAINE (Sartay, 20/10 au soir : « je peux venir avec 5 000 et les bots n'en ont que 40 ») : le tapis
//      des boss venait de ton 1er buy-in du jour, et rien ne bornait les suivants. Désormais c'est le JOUR qui le fixe
//      (POKER_WEEK_MENU : au plus `amount` ⚡ et au plus `pct` % de ta jauge), ton buy-in ne dépasse JAMAIS ce tapis
//      (MAX_BUYIN_SHARE) et la table fait entre 10 et 100 grosses blindes de profondeur : les jours prestigieux, les
//      blindes MONTENT avec les tapis (samedi, 20 000 par boss → 100/200) au lieu d'offrir des tables à 1 000 BB.

export const CASH_SEATS = 6 // toi + 5 boss

/** Gain NET maximal encaissable sur la maison par JOUR, tout casino confondu (Sartay 20/10/2026 : 10 000). */
export const CASINO_DAILY_NET_CAP = 10_000

// ══════════════════ MENU DE LA SEMAINE (annoncé par le croupier) ══════════════════
export interface PokerMenuDay {
    day: string     // le jour, pour l'affichage
    dish: string    // le « plat » du jour : du plus modeste (lundi) au plus prestigieux (samedi)
    amount: number  // tapis maximal donné à CHAQUE boss (⚡)…
    pct: number     // … et au plus ce % de la jauge du joueur (repsCap)
}
/** Indexé par jour de la semaine UTC (0 = dimanche … 6 = samedi, comme Date.getUTCDay) : le jour du reset des boss. */
export const POKER_WEEK_MENU: readonly PokerMenuDay[] = [
    { day: "Dimanche", dish: "Ravioli de la nonna", amount: 4_000, pct: 40 },
    { day: "Lundi", dish: "Coquillettes", amount: 1_000, pct: 10 },
    { day: "Mardi", dish: "Spaghetti bolo", amount: 2_000, pct: 20 },
    { day: "Mercredi", dish: "Penne arrabbiata", amount: 3_000, pct: 30 },
    { day: "Jeudi", dish: "Lasagnes", amount: 4_000, pct: 40 },
    { day: "Vendredi", dish: "Carbonara royale", amount: 10_000, pct: 100 },
    { day: "Samedi", dish: "Truffe blanche", amount: 20_000, pct: 200 },
]
/** Ordre d'affichage du menu : la semaine commence le lundi. */
export const POKER_MENU_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0]
/** Jour de la semaine (0 = dimanche … 6 = samedi) d'une clé « AAAA-MM-JJ » (jour UTC du casino).
 *  Clé illisible → lundi (la plus petite table). */
export function weekdayOfDayKey(dayKey: string): number {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey || "")
    if (!m) return 1
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
    return Number.isNaN(d.getTime()) ? 1 : d.getUTCDay()
}
export function pokerMenuFor(dayKey: string): PokerMenuDay {
    return POKER_WEEK_MENU[weekdayOfDayKey(dayKey)]
}
/** Tapis donné à CHAQUE boss ce jour-là pour cette jauge : le montant du jour, sans dépasser pct % de la jauge (≥ 1). */
export function menuBossStack(menu: PokerMenuDay, gauge: number): number {
    const g = Math.max(0, Math.floor(gauge || 0))
    return Math.max(1, Math.floor(Math.min(menu.amount, (g * menu.pct) / 100)))
}
/** Ton buy-in ne dépasse jamais cette part du tapis d'un boss (Sartay : « pas plus qu'un certain % de ce que les
 *  bots peuvent avoir ») : 100 % — tu ne t'assois jamais plus gros qu'un boss frais. */
export const MAX_BUYIN_SHARE = 1
/** Profondeur de la table (tapis d'un boss ÷ grosse blinde) : jamais plus de 100 BB — au-delà, les blindes montent avec
 *  le prestige du jour (une table à 1 000 BB démultiplierait la moindre faille de jeu) — et jamais moins de 10 BB (le
 *  buy-in minimal, 10 BB, doit tenir dans le tapis d'un boss). Entre les deux, la jauge fixe le plancher des blindes. */
export const MAX_TABLE_DEPTH_BB = 100
export const MIN_TABLE_DEPTH_BB = 10

// ── La journée du cash : le tapis des boss est FIXÉ à la 1re assise du jour, puis ne bouge plus. ──
/** Clé de jour du cash. Préfixe « menu: » : une save d'avant le menu (pokerCashDate = « AAAA-MM-JJ », cap = 1er
 *  buy-in) repart sur le menu dès sa prochaine assise, même le jour du déploiement. */
export function cashDayTag(today: string): string {
    return "menu:" + today
}
export interface CashDayState { date: string; cap: number; bossStacks: Record<string, number> }
/** Ouvre (ou reprend) la journée : même jour → tapis du jour et tapis des boss conservés ; nouveau jour (ou save d'avant
 *  le menu) → tapis du menu pour la jauge du moment, boss neufs. */
export function openCashDay(prev: CashDayState, today: string, gauge: number): CashDayState {
    const tag = cashDayTag(today)
    if (prev.date === tag && prev.cap > 0) return { date: tag, cap: prev.cap, bossStacks: { ...prev.bossStacks } }
    return { date: tag, cap: menuBossStack(pokerMenuFor(today), gauge), bossStacks: {} }
}
/** Tapis des boss aujourd'hui, tel que la table l'appliquera : celui déjà fixé si tu t'es assis aujourd'hui, sinon
 *  celui du menu pour ta jauge. */
export function cashDayStake(prev: { date: string; cap: number }, today: string, gauge: number): number {
    return prev.date === cashDayTag(today) && prev.cap > 0 ? prev.cap : menuBossStack(pokerMenuFor(today), gauge)
}

/** Blindes du cash du jour selon la JAUGE du joueur (repsCap) : 2 BB par tranche de 1 000 ⚡, plancher 1/2 — et, quand
 *  le tapis des boss est donné, une table entre MIN_TABLE_DEPTH_BB et MAX_TABLE_DEPTH_BB de profondeur.
 *  Un joueur sous plafond casino (vœu du génie) reste en 1/2 : sa mise est bornée. */
export function cashBlindsFor(gauge: number, restricted = false, bossStack?: number): { sb: number; bb: number } {
    if (restricted) return { sb: 1, bb: 2 }
    let bb = Math.max(2, 2 * Math.floor(Math.max(0, Math.floor(gauge || 0)) / 1000))
    if (bossStack !== undefined) {
        const stake = Math.max(0, Math.floor(bossStack || 0))
        const low = 2 * Math.ceil(stake / (2 * MAX_TABLE_DEPTH_BB))   // BB ≥ tapis/100 : jamais plus de 100 BB de profondeur
        const high = 2 * Math.floor(stake / (2 * MIN_TABLE_DEPTH_BB)) // BB ≤ tapis/10 : jamais moins de 10 BB
        bb = Math.max(2, Math.min(Math.max(bb, low), high))
    }
    return { sb: Math.max(1, Math.floor(bb / 2)), bb }
}
export const MIN_BUYIN_BB = 10
export const DEFAULT_BUYIN_BB = 20
/** Bornes de buy-in : minimum 10 BB, conseillé 20 BB, et JAMAIS plus que MAX_BUYIN_SHARE × le tapis d'un boss
 *  (sur une table minuscule, le minimum et le conseillé s'effacent devant ce plafond). */
export function cashBuyinBounds(bb: number, bossStack: number): { min: number; def: number; max: number } {
    const b = Math.max(2, Math.floor(bb))
    const max = Math.max(1, Math.floor(Math.max(1, Math.floor(bossStack || 0)) * MAX_BUYIN_SHARE))
    return { min: Math.min(MIN_BUYIN_BB * b, max), def: Math.min(DEFAULT_BUYIN_BB * b, max), max }
}

/** Tapis de départ d'un boss pour une nouvelle partie cash (cap = le tapis du menu du jour) :
 *  - null    → RUINÉ aujourd'hui (stored === 0) → ne s'assoit PAS.
 *  - cap     → nouveau boss du jour (jamais vu) : don initial, le tapis du menu.
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
