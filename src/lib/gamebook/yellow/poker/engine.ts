// src/lib/gamebook/yellow/poker/engine.ts
//
// Nexus — Poker Texas Hold'em : MOTEUR d'enchères PUR (cash game, 2-7 joueurs).
// Table autoritaire (mutée en place → un serveur/croupier applique les actions). Gère blinds, tours
// (preflop/flop/turn/river), relance minimale, all-in + SIDE-POTS, abattage. Multijoueur = Phase 2 (au-dessus).
// La mise est en « reps » (stack). RNG injecté → distribution rejouable/testable.

import { Rng } from "../battle/rng"
import { shuffledDeck, type Card } from "./cards"
import { evaluateBest, compareHands, type HandRank } from "./handEval"

export type Phase = "preflop" | "flop" | "turn" | "river" | "showdown" | "handComplete"
export type ActionKind = "fold" | "check" | "call" | "raise" | "allin"
export interface PokerAction {
    kind: ActionKind
    /** Pour "raise" : montant TOTAL misé sur le tour (« relancer À »). Ignoré sinon. */
    to?: number
}

export interface Seat {
    id: string
    name: string
    stack: number          // reps disponibles
    hole: Card[]           // 2 cartes privées (jamais diffusées aux autres → géré par le serveur)
    folded: boolean
    allIn: boolean
    committed: number      // total engagé dans le POT sur toute la main (base des side-pots)
    betThisRound: number   // engagé dans le TOUR d'enchères courant
    hasActed: boolean      // a agi depuis la dernière relance (clôture du tour)
    sittingOut: boolean    // hors de la MAIN COURANTE (recalculé à chaque startHand)
    wantsSitOut?: boolean  // choix VOLONTAIRE de ne pas jouer (persistant, respecté par startHand)
    leaving?: boolean      // départ demandé → retiré de la table ENTRE deux mains (cf. room.ts)
    bot?: boolean          // joueur IA (comble la table à ≥4 ; joue tout seul côté serveur, cf. poker/bots.ts)
}

export interface PotResult { amount: number; winners: number[]; eligible: number[] }

export interface PokerTable {
    seats: Seat[]
    button: number
    community: Card[]
    deck: Card[]
    phase: Phase
    currentBet: number     // mise à suivre dans le tour courant
    minRaise: number       // incrément de relance minimal
    toAct: number          // siège dont c'est le tour (-1 = personne / tour clos)
    blinds: { sb: number; bb: number }
    handId: number
    results: PotResult[]    // rempli à l'abattage (répartition des pots)
    showdownOccurred: boolean // true si la main s'est finie sur un ABATTAGE (→ on révèle les mains non couchées)
    log: string[]
}

const seatName = (t: PokerTable, i: number) => t.seats[i]?.name ?? `#${i}`

/** Somme de tout ce qui est engagé (= pot total, side-pots inclus). */
export function totalPot(t: PokerTable): number {
    return t.seats.reduce((s, x) => s + x.committed, 0)
}

/** Crée une table (cash game). Les joueurs à stack 0 seront « sitting out » jusqu'à recave. */
export function createTable(players: Array<{ id: string; name: string; stack: number }>, blinds: { sb: number; bb: number }): PokerTable {
    return {
        seats: players.map((p) => ({ id: p.id, name: p.name, stack: p.stack, hole: [], folded: false, allIn: false, committed: 0, betThisRound: 0, hasActed: false, sittingOut: p.stack <= 0 })),
        button: 0, community: [], deck: [], phase: "handComplete", currentBet: 0, minRaise: blinds.bb, toAct: -1, blinds, handId: 0, results: [], showdownOccurred: false, log: [],
    }
}

/** Indices des sièges ÉLIGIBLES à jouer une main (assis, avec du tapis). */
function inHandSeats(t: PokerTable): number[] {
    return t.seats.map((s, i) => ({ s, i })).filter((x) => !x.s.sittingOut && x.s.stack > 0).map((x) => x.i)
}
/** Prochain siège (sens horaire) satisfaisant `ok`, en partant APRÈS `from`. -1 si aucun. */
function nextSeat(t: PokerTable, from: number, ok: (s: Seat) => boolean): number {
    const n = t.seats.length
    for (let k = 1; k <= n; k++) {
        const i = (from + k) % n
        if (ok(t.seats[i])) return i
    }
    return -1
}
/** Peut encore agir ce tour : en main, pas couché, pas all-in, avec du tapis. */
const canAct = (s: Seat) => !s.folded && !s.allIn && !s.sittingOut && s.stack > 0
/** Encore en lice pour le pot (pas couché). */
const contesting = (s: Seat) => !s.folded && !s.sittingOut

function commit(t: PokerTable, i: number, amount: number): number {
    const s = t.seats[i]
    const pay = Math.min(amount, s.stack)
    s.stack -= pay
    s.committed += pay
    s.betThisRound += pay
    if (s.stack === 0) s.allIn = true
    return pay
}

/** Démarre une nouvelle main : bouton tournant, mélange, distribue, poste les blinds, place l'action. */
export function startHand(t: PokerTable, rng: Rng): void {
    // Qui est dans la main : ceux avec du tapis ET qui ne demandent pas volontairement à passer.
    for (const s of t.seats) { s.sittingOut = !!s.wantsSitOut || s.stack <= 0; s.hole = []; s.folded = false; s.allIn = false; s.committed = 0; s.betThisRound = 0; s.hasActed = false }
    const inHand = inHandSeats(t)
    if (inHand.length < 2) { t.phase = "handComplete"; t.toAct = -1; t.log = ["Pas assez de joueurs."]; return }

    t.handId += 1
    t.button = nextSeat(t, t.button, (s) => !s.sittingOut && s.stack > 0)
    t.deck = shuffledDeck(rng)
    t.community = []
    t.results = []
    t.showdownOccurred = false
    t.log = []
    t.phase = "preflop"

    // Positions des blinds (règle heads-up : le BOUTON est petite blinde et parle en 1er préflop).
    const heads = inHand.length === 2
    const sb = heads ? t.button : nextSeat(t, t.button, (s) => !s.sittingOut && s.stack > 0)
    const bb = nextSeat(t, sb, (s) => !s.sittingOut && s.stack > 0)

    // Distribue 2 cartes (2 tours) aux joueurs en main.
    for (let round = 0; round < 2; round++) for (const i of inHand) t.seats[i].hole.push(t.deck.pop()!)

    commit(t, sb, t.blinds.sb); t.log.push(`${seatName(t, sb)} pose la petite blinde (${t.blinds.sb}).`)
    commit(t, bb, t.blinds.bb); t.log.push(`${seatName(t, bb)} pose la grosse blinde (${t.blinds.bb}).`)
    t.currentBet = t.blinds.bb
    t.minRaise = t.blinds.bb
    // 1er à parler préflop : après la BB (ou le bouton en heads-up).
    t.toAct = heads ? sb : nextSeat(t, bb, canAct)
    if (t.toAct === -1 || !canAct(t.seats[t.toAct])) maybeCloseRound(t) // tout le monde all-in via blinds
}

/** Options légales pour le siège dont c'est le tour (pour l'UI + validation). */
export function legalActions(t: PokerTable, i: number): { canCheck: boolean; toCall: number; minRaiseTo: number; maxRaiseTo: number } {
    const s = t.seats[i]
    const toCall = Math.max(0, t.currentBet - s.betThisRound)
    const minRaiseTo = t.currentBet + t.minRaise
    const maxRaiseTo = s.betThisRound + s.stack // all-in max
    return { canCheck: toCall === 0, toCall, minRaiseTo, maxRaiseTo }
}

/** Applique l'action du siège `i`. Illégal → no-op journalisé. Fait avancer l'action / le tour. */
export function act(t: PokerTable, i: number, action: PokerAction): void {
    if (t.toAct !== i || !canAct(t.seats[i])) { t.log.push("Action ignorée (ce n'est pas ton tour)."); return }
    const s = t.seats[i]
    const { canCheck, toCall, minRaiseTo, maxRaiseTo } = legalActions(t, i)

    switch (action.kind) {
        case "fold":
            s.folded = true; s.hasActed = true
            t.log.push(`${seatName(t, i)} se couche.`)
            break
        case "check":
            if (!canCheck) { t.log.push("Check illégal (il y a une mise à suivre)."); return }
            s.hasActed = true
            t.log.push(`${seatName(t, i)} checke.`)
            break
        case "call": {
            const paid = commit(t, i, toCall)
            s.hasActed = true
            t.log.push(`${seatName(t, i)} suit (${paid}).`)
            break
        }
        case "allin": {
            const target = s.betThisRound + s.stack
            applyBetTo(t, i, target, true)
            break
        }
        case "raise": {
            const to = action.to ?? minRaiseTo
            // Relance légale si ≥ minRaiseTo, ou all-in (≤ maxRaiseTo mais < minRaiseTo autorisé en all-in).
            if (to > maxRaiseTo) { t.log.push("Relance > tapis."); return }
            if (to < minRaiseTo && to !== maxRaiseTo) { t.log.push("Relance trop faible."); return }
            applyBetTo(t, i, to, false)
            break
        }
    }
    advance(t)
}

/** Mise/relance À un total `to` (borne au tapis). Met à jour currentBet/minRaise et RÉOUVRE le tour. */
function applyBetTo(t: PokerTable, i: number, to: number, isAllInWord: boolean): void {
    const s = t.seats[i]
    const add = Math.min(to - s.betThisRound, s.stack)
    const newBet = s.betThisRound + add
    const raiseSize = newBet - t.currentBet
    commit(t, i, add)
    s.hasActed = true
    if (newBet > t.currentBet) {
        if (raiseSize >= t.minRaise) t.minRaise = raiseSize // une VRAIE relance rouvre le tour + fixe le nouvel incrément
        t.currentBet = newBet
        // Rouvre l'action : tous les autres non-couchés/non-all-in doivent re-parler.
        for (let k = 0; k < t.seats.length; k++) if (k !== i && canAct(t.seats[k])) t.seats[k].hasActed = false
    }
    t.log.push(`${seatName(t, i)} ${isAllInWord ? "fait tapis" : "relance"} à ${newBet}${s.allIn ? " (all-in)" : ""}.`)
}

/** Fait avancer l'action au prochain joueur, ou clôt le tour si tout le monde a parlé/égalisé. */
function advance(t: PokerTable): void {
    // Un seul joueur encore en lice → main terminée, il rafle le pot (sans abattage).
    const alive = t.seats.map((s, i) => ({ s, i })).filter((x) => contesting(x.s))
    if (alive.length === 1) { awardUncontested(t, alive[0].i); return }
    maybeCloseRound(t)
}

/** Le tour est-il clos ? (tous les joueurs pouvant agir ont agi ET égalisé la mise). */
function roundClosed(t: PokerTable): boolean {
    const actors = t.seats.filter(canAct)
    if (actors.length === 0) return true // plus personne ne peut agir (tous all-in/couchés)
    return actors.every((s) => s.hasActed && s.betThisRound === t.currentBet)
}

function maybeCloseRound(t: PokerTable): void {
    if (!roundClosed(t)) {
        // Passe la main au prochain joueur pouvant agir (en partant du siège courant).
        t.toAct = nextSeat(t, t.toAct === -1 ? t.button : t.toAct, canAct)
        return
    }
    // Tour clos → rue suivante.
    for (const s of t.seats) { s.betThisRound = 0; s.hasActed = false }
    t.currentBet = 0
    t.minRaise = t.blinds.bb

    // Si plus personne ne peut miser (tous all-in ou 1 seul actif), on déroule les rues restantes jusqu'à l'abattage.
    const canStillBet = t.seats.filter(canAct).length
    const nextPhase: Record<Phase, Phase> = { preflop: "flop", flop: "turn", turn: "river", river: "showdown", showdown: "showdown", handComplete: "handComplete" }
    const deal = (n: number) => { for (let k = 0; k < n; k++) t.community.push(t.deck.pop()!) }

    const go = () => {
        t.phase = nextPhase[t.phase]
        if (t.phase === "flop") { deal(3); t.log.push(`Flop : ${t.community.slice(-3).map(cardStr).join(" ")}`) }
        else if (t.phase === "turn") { deal(1); t.log.push(`Turn : ${cardStr(t.community[t.community.length - 1])}`) }
        else if (t.phase === "river") { deal(1); t.log.push(`River : ${cardStr(t.community[t.community.length - 1])}`) }
    }

    if (t.phase === "river") { settleShowdown(t); return }
    go()
    if (t.phase === "showdown") { settleShowdown(t); return }
    // Personne ne peut plus miser → on enchaîne directement les rues suivantes jusqu'à l'abattage.
    if (canStillBet <= 1) { maybeCloseRound(t); return }
    // Sinon, 1er à parler post-flop = 1er joueur actif après le bouton.
    t.toAct = nextSeat(t, t.button, canAct)
}

function cardStr(c: Card): string {
    const RANK: Record<number, string> = { 11: "V", 12: "D", 13: "R", 14: "A" }
    return (RANK[c.rank] ?? String(c.rank)) + "♠♥♦♣"[c.suit]
}

/** Main non disputée (tous les autres couchés) : le dernier debout rafle tout le pot. */
function awardUncontested(t: PokerTable, i: number): void {
    const amount = totalPot(t)
    t.seats[i].stack += amount
    t.results = [{ amount, winners: [i], eligible: [i] }]
    t.phase = "handComplete"
    t.toAct = -1
    t.log.push(`${seatName(t, i)} remporte le pot (${amount}) sans abattage.`)
}

/** Construit les pots (principal + side-pots) par strates de mise engagée. */
export function buildPots(t: PokerTable): PotResult[] {
    const levels = [...new Set(t.seats.filter((s) => s.committed > 0).map((s) => s.committed))].sort((a, b) => a - b)
    const pots: PotResult[] = []
    let prev = 0
    for (const lvl of levels) {
        const layer = lvl - prev
        const contributors = t.seats.map((s, i) => ({ s, i })).filter((x) => x.s.committed >= lvl)
        const amount = layer * contributors.length
        const eligible = contributors.filter((x) => contesting(x.s)).map((x) => x.i)
        if (amount > 0) pots.push({ amount, winners: [], eligible })
        prev = lvl
    }
    return pots
}

/** Abattage : évalue les mains, répartit chaque pot entre les meilleurs éligibles (split + chips impairs). */
export function settleShowdown(t: PokerTable): void {
    t.phase = "showdown"
    t.showdownOccurred = true
    const ranks: Record<number, HandRank> = {}
    for (const i of t.seats.map((_, i) => i)) if (contesting(t.seats[i])) ranks[i] = evaluateBest([...t.seats[i].hole, ...t.community])

    const pots = buildPots(t)
    for (const pot of pots) {
        if (pot.eligible.length === 0) continue
        // Meilleure main parmi les éligibles.
        let best: HandRank | null = null
        for (const i of pot.eligible) if (!best || compareHands(ranks[i], best) > 0) best = ranks[i]
        const winners = pot.eligible.filter((i) => compareHands(ranks[i], best!) === 0)
        pot.winners = winners
        const share = Math.floor(pot.amount / winners.length)
        let remainder = pot.amount - share * winners.length
        // Chips impairs : au(x) gagnant(s) le(s) plus proche(s) à gauche du bouton.
        const ordered = [...winners].sort((a, b) => ((a - t.button + t.seats.length) % t.seats.length) - ((b - t.button + t.seats.length) % t.seats.length))
        for (const w of ordered) { t.seats[w].stack += share + (remainder > 0 ? 1 : 0); if (remainder > 0) remainder-- }
    }
    t.results = pots
    t.phase = "handComplete"
    t.toAct = -1
    const names = pots.flatMap((p) => p.winners).map((i) => seatName(t, i))
    t.log.push(`Abattage — ${[...new Set(names)].join(", ")} remporte(nt) le(s) pot(s).`)
}
