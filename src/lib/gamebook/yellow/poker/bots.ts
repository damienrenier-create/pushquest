// src/lib/gamebook/yellow/poker/bots.ts
//
// Nexus — Poker : JOUEURS IA (comblent la table à ≥ MIN joueurs quand les potes ne sont pas tous là).
// - botDecision : heuristique simple (force de main + pot odds + aléa) → fold/check/call/raise/allin.
// - runBots : joue automatiquement TOUS les tours de bots consécutifs (côté serveur) jusqu'au tour d'un
//   humain ou la fin de main → aucun blocage quand c'est à un bot de parler.
// - ensureBots : ajuste le nb de bots ENTRE les mains (fill jusqu'à `target`, retire si assez d'humains,
//   recave les bots ruinés). Les bots = « la maison » : leurs jetons ne sont pas des reps (house-style).

import { Rng } from "../battle/rng"
import { act, legalActions, totalPot, type PokerAction, type PokerTable } from "./engine"
import { pruneSeats } from "./room"
import { evaluateBest } from "./handEval"

export const BOT_BUYIN = 1000

// ── PERSONNALITÉS D'IA ──────────────────────────────────────────────────────────────────────────
// Chaque bot a un style FIXE (déterministe par siège). Certains sont plus forts, d'autres exploitables.
//   tight  : sélection des mains (élevé = se couche + facilement) · aggro : préférence relance/tapis
//   bluff  : fréquence de bluff sur main faible · skill : discipline (bas = suit trop, « calling station »)
export interface BotPersona { name: string; tight: number; aggro: number; bluff: number; skill: number }
const PERSONAS: BotPersona[] = [
    { name: "Botsaï",      tight: 0.75, aggro: 0.75, bluff: 0.10, skill: 0.90 }, // requin tight-aggressive (FORT)
    { name: "IA-Roupoker", tight: 0.25, aggro: 0.20, bluff: 0.05, skill: 0.35 }, // calling station large-passif (FAIBLE, exploitable)
    { name: "Ordibluff",   tight: 0.45, aggro: 0.85, bluff: 0.38, skill: 0.55 }, // maniac bluffeur (imprévisible)
    { name: "Némébot",     tight: 0.60, aggro: 0.55, bluff: 0.12, skill: 0.95 }, // solide équilibré (FORT)
    { name: "K.O.-Robot",  tight: 0.35, aggro: 0.80, bluff: 0.22, skill: 0.50 }, // loose-aggressive (spew)
    { name: "Cartobot",    tight: 0.88, aggro: 0.35, bluff: 0.03, skill: 0.72 }, // rocher ultra-serré passif
]
/** Personnalité d'un bot d'après son siège (id "bot_N" → persona fixe ; sinon hash déterministe). */
export function personaFor(seatId: string): BotPersona {
    const m = /^bot_(\d+)$/.exec(seatId)
    const idx = m ? parseInt(m[1], 10) - 1 : [...seatId].reduce((a, c) => a + c.charCodeAt(0), 0)
    return PERSONAS[((idx % PERSONAS.length) + PERSONAS.length) % PERSONAS.length]
}

/** Force de main du bot ∈ [0,1] : préflop = valeur des 2 cartes ; postflop = catégorie de la meilleure main. */
function handStrength(t: PokerTable, i: number): number {
    const s = t.seats[i]
    if (s.hole.length < 2) return 0
    if (t.community.length === 0) {
        const [hi, lo] = s.hole.map((c) => c.rank).sort((a, b) => b - a)
        const pair = hi === lo
        const suited = s.hole[0].suit === s.hole[1].suit
        let str = (hi + lo) / 28              // hauteur des cartes (2+2 → .14 ; A+A → 1)
        if (pair) str += 0.35                 // paire servie
        if (suited) str += 0.06               // assorties
        if (!pair && hi - lo <= 2) str += 0.04 // connecteurs
        return Math.min(1, str)
    }
    const r = evaluateBest([...s.hole, ...t.community])
    return Math.min(1, r.category / 8 + (r.tiebreak[0] ?? 0) / 220) // catégorie (0..8)/8 + petit départage
}

/** Décision d'un bot pour le siège `i` (c'est son tour). */
export function botDecision(t: PokerTable, i: number, rng: Rng): PokerAction {
    const { canCheck, toCall, minRaiseTo, maxRaiseTo } = legalActions(t, i)
    const s = t.seats[i]
    const str = handStrength(t, i)
    const p = personaFor(s.id)                 // style FIXE du bot (tight/aggro/bluff/skill)
    const r = rng.next()
    const canRaise = maxRaiseTo > minRaiseTo
    const raiseTo = (frac: number) => Math.min(maxRaiseTo, minRaiseTo + Math.floor((maxRaiseTo - minRaiseTo) * frac))

    if (canCheck) {
        // Value bet : d'autant + probable que la main est forte ET que le bot est agressif.
        if (str > 0.6 && canRaise && r < p.aggro) return { kind: "raise", to: raiseTo(0.35 + p.aggro * 0.3) }
        // Bluff : à la fréquence propre du bot, sur main faible.
        if (str < 0.35 && canRaise && r < p.bluff) return { kind: "raise", to: raiseTo(0.3) }
        return { kind: "check" }
    }
    // Face à une mise : seuil de fold modulé par le style. Serré (tight) → se couche +. Peu skillé → respecte
    // mal les pot-odds et « suit quand même » (calling station).
    const potOdds = toCall / Math.max(1, totalPot(t) + toCall)
    const foldThreshold = 0.12 + p.tight * 0.22 + potOdds * (0.3 + p.skill * 0.4)
    if (str < foldThreshold) {
        if (r > p.skill && str > foldThreshold * 0.55) return { kind: "call" } // erreur de discipline (suit une main marginale)
        return { kind: "fold" }
    }
    // Main jouable : relance de valeur si forte + agressive, sinon suivre (ou tapis si couvert).
    if (str > 0.7 && canRaise && r < p.aggro * 0.8) return { kind: "raise", to: raiseTo(0.4 + p.aggro * 0.3) }
    return toCall >= s.stack ? { kind: "allin" } : { kind: "call" }
}

/** Fait jouer tous les bots dont c'est le tour, à la suite, jusqu'au tour d'un HUMAIN ou la fin de main. */
export function runBots(t: PokerTable, rng: Rng): void {
    let guard = 0
    while (guard++ < 80) {
        if (t.toAct < 0) break
        if (t.phase !== "preflop" && t.phase !== "flop" && t.phase !== "turn" && t.phase !== "river") break
        const s = t.seats[t.toAct]
        if (!s || !s.bot) break // au tour d'un humain → on rend la main
        act(t, t.toAct, botDecision(t, t.toAct, rng))
    }
}

/** Ajuste les bots ENTRE les mains : comble jusqu'à `target` joueurs SI ≥1 humain, retire sinon, recave les ruinés. */
export function ensureBots(t: PokerTable, target = 4, maxSeats = 7, botBuyin = BOT_BUYIN): void {
    if (t.phase !== "handComplete") return // ne jamais toucher la table en pleine main
    const humans = t.seats.filter((s) => !s.bot && !s.leaving)
    // Aucun humain → table au repos : on vire tous les bots.
    if (humans.length === 0) { for (const s of t.seats) if (s.bot) s.leaving = true; pruneSeats(t); return }

    const wanted = Math.max(0, Math.min(target, maxSeats) - humans.length)
    // Recave les bots ruinés (la maison remet du tapis, au MÊME plafond que le buy-in courant).
    for (const s of t.seats) if (s.bot && s.stack <= 0) s.stack = botBuyin
    // Trop de bots (assez d'humains) → on en retire.
    const bots = t.seats.filter((s) => s.bot && !s.leaving)
    for (let k = wanted; k < bots.length; k++) bots[k].leaving = true
    // Pas assez → on en ajoute (ids stables bot_1..bot_N → persona + persistance entre les mains).
    for (let n = 1; n <= maxSeats && t.seats.filter((s) => s.bot && !s.leaving).length < wanted; n++) {
        const id = `bot_${n}`
        if (t.seats.some((s) => s.id === id && !s.leaving)) continue
        t.seats.push({ id, name: personaFor(id).name, stack: botBuyin, hole: [], folded: false, allIn: false, committed: 0, betThisRound: 0, hasActed: false, sittingOut: true, wantsSitOut: false, bot: true })
    }
    pruneSeats(t)
}
