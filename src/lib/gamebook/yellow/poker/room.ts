// src/lib/gamebook/yellow/poker/room.ts
//
// Nexus — Poker multijoueur : orchestration de TABLE côté serveur (pur, testable).
// - publicView : vue REDACTÉE par spectateur — cartes des AUTRES cachées (sauf abattage), paquet retiré.
//   C'est la garantie « on ne voit pas les cartes des voisins » (chaque client reçoit SA vue).
// - cycle de vie : join / sit-out / leave / relance auto de main / action par timeout.
// La table autoritaire (PokerTable) vit côté serveur ; ce module produit ce que chaque client peut voir.

import { Rng } from "../battle/rng"
import type { Card } from "./cards"
import { act, legalActions, startHand, totalPot, type PokerTable, type PotResult } from "./engine"

// ── Vue publique (par joueur) ──
export interface PublicSeat {
    id: string
    name: string
    stack: number
    folded: boolean
    allIn: boolean
    committed: number
    betThisRound: number
    hasActed: boolean
    sittingOut: boolean
    holeCount: number
    /** Cartes visibles : présentes UNIQUEMENT pour le viewer lui-même, ou à l'abattage pour les mains non couchées. */
    hole?: Card[]
}
export interface PublicTable {
    seats: PublicSeat[]
    button: number
    community: Card[]
    phase: PokerTable["phase"]
    currentBet: number
    minRaise: number
    toAct: number
    blinds: PokerTable["blinds"]
    handId: number
    results: PotResult[]
    pot: number
    log: string[]
}

/** Redaction : ce que le joueur `viewerId` a le droit de voir (jamais les cartes des autres, jamais le paquet). */
export function publicView(t: PokerTable, viewerId?: string): PublicTable {
    const reveal = t.phase === "handComplete" && t.showdownOccurred // abattage → on montre les mains non couchées
    return {
        button: t.button,
        community: [...t.community],
        phase: t.phase,
        currentBet: t.currentBet,
        minRaise: t.minRaise,
        toAct: t.toAct,
        blinds: { ...t.blinds },
        handId: t.handId,
        results: t.results.map((r) => ({ ...r, winners: [...r.winners], eligible: [...r.eligible] })),
        pot: totalPot(t),
        log: [...t.log],
        seats: t.seats.map((s) => ({
            id: s.id, name: s.name, stack: s.stack, folded: s.folded, allIn: s.allIn,
            committed: s.committed, betThisRound: s.betThisRound, hasActed: s.hasActed, sittingOut: s.sittingOut,
            holeCount: s.hole.length,
            hole: (s.id === viewerId || (reveal && !s.folded)) ? [...s.hole] : undefined,
        })),
    }
}

// ── Cycle de vie de la table ──

/** Un joueur s'assoit (recave `buyin`). Il rejoint « sitting out » → entre à la MAIN suivante. */
export function joinTable(t: PokerTable, player: { id: string; name: string; buyin: number }): boolean {
    if (t.seats.some((s) => s.id === player.id)) return false // déjà à la table
    t.seats.push({
        id: player.id, name: player.name, stack: Math.max(0, player.buyin),
        hole: [], folded: false, allIn: false, committed: 0, betThisRound: 0, hasActed: false,
        sittingOut: true, wantsSitOut: false, // hors de la main COURANTE, mais jouera la SUIVANTE
    })
    return true
}

/** Recave (rachat de jetons) — autorisé ENTRE les mains uniquement. */
export function rebuy(t: PokerTable, userId: string, amount: number): boolean {
    if (t.phase !== "handComplete") return false
    const s = t.seats.find((x) => x.id === userId)
    if (!s || amount <= 0) return false
    s.stack += amount
    return true
}

/** Se mettre hors-jeu / revenir VOLONTAIREMENT (prend effet à la main suivante via startHand). */
export function setSitOut(t: PokerTable, userId: string, out: boolean): void {
    const s = t.seats.find((x) => x.id === userId)
    if (s) s.wantsSitOut = out
}

/** Quitter : si en pleine main et pas couché → il abandonne. Le siège est RETIRÉ entre deux mains (pruneSeats).
 *  Renvoie le tapis rendu au joueur (à recréditer en reps par l'appelant). */
export function leaveTable(t: PokerTable, userId: string): number {
    const i = t.seats.findIndex((x) => x.id === userId)
    if (i < 0) return 0
    const s = t.seats[i]
    const refund = s.stack
    if (!s.folded && t.phase !== "handComplete") {
        // Abandonne sa main en cours. Si c'était son tour, on fait avancer l'action.
        if (t.toAct === i) act(t, i, { kind: "fold" })
        else s.folded = true
    }
    s.stack = 0
    s.sittingOut = true
    s.wantsSitOut = true
    s.leaving = true
    return refund
}

/** Retire les sièges partis / vides — à appeler ENTRE deux mains uniquement. Réajuste l'index du bouton. */
export function pruneSeats(t: PokerTable): void {
    if (t.phase !== "handComplete") return
    const buttonId = t.seats[t.button]?.id
    t.seats = t.seats.filter((s) => !s.leaving)
    const bi = t.seats.findIndex((s) => s.id === buttonId)
    t.button = bi >= 0 ? bi : 0
}

/** Nombre de joueurs qui joueront la PROCHAINE main (tapis > 0, pas de départ, pas de sit-out volontaire). */
export function readyCount(t: PokerTable): number {
    return t.seats.filter((s) => s.stack > 0 && !s.leaving && !s.wantsSitOut).length
}

/** Relance une main si la précédente est finie et qu'au moins 2 joueurs sont prêts. Renvoie true si une main démarre. */
export function maybeStartHand(t: PokerTable, rng: Rng): boolean {
    if (t.phase !== "handComplete") return false
    pruneSeats(t)
    if (readyCount(t) < 2) return false
    startHand(t, rng)
    return true
}

/** Action par TIMEOUT du joueur dont c'est le tour : check si possible, sinon fold (utilisé par la minuterie serveur). */
export function timeoutAction(t: PokerTable): void {
    if (t.toAct < 0) return
    const { canCheck } = legalActions(t, t.toAct)
    act(t, t.toAct, { kind: canCheck ? "check" : "fold" })
}
