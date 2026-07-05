// src/lib/gamebook/yellow/poker/bots.ts
//
// Nexus — Poker : JOUEURS IA (comblent la table à ≥ MIN joueurs quand les potes ne sont pas tous là).
// - botDecision : heuristique simple (force de main + pot odds + aléa) → fold/check/call/raise/allin.
// - runBots : joue automatiquement TOUS les tours de bots consécutifs (côté serveur) jusqu'au tour d'un
//   humain ou la fin de main → aucun blocage quand c'est à un bot de parler.
// - ensureBots : ajuste le nb de bots ENTRE les mains (fill jusqu'à `target`, retire si assez d'humains,
//   recave les bots ruinés). Les bots = « la maison » : leurs jetons ne sont pas des reps (house-style).

import { Rng } from "../battle/rng"
import { act, legalActions, totalPot, type PokerAction, type PokerTable, type BotProfile } from "./engine"
import { pruneSeats } from "./room"
import { evaluateBest } from "./handEval"

export const BOT_BUYIN = 1000

// ── LES IA = les BOSS de la Ligue & des arènes, chacun avec 2 PERSONNALITÉS ───────────────────────
// À chaque partie on tire des boss AU HASARD (distincts à la table) et, pour chacun, UNE de ses 2
// personnalités (tirée au hasard aussi) → chaque table est différente. Le profil est STOCKÉ sur le
// siège (Seat.persona) → il persiste toute la partie. Ils jouent « comme ils combattent ».
//   tight : sélection des mains · aggro : préférence relance/tapis · bluff : fréquence de bluff · skill : discipline
interface PokerBoss { name: string; styles: [BotProfile, BotProfile] }
const POKER_BOSSES: PokerBoss[] = [
    // Arènes
    { name: "Volta",  styles: [{ tight: .75, aggro: .75, bluff: .10, skill: .90 }, { tight: .55, aggro: .90, bluff: .28, skill: .60 }] }, // requin / foudroyant
    { name: "Pyra",   styles: [{ tight: .35, aggro: .85, bluff: .28, skill: .50 }, { tight: .62, aggro: .55, bluff: .12, skill: .72 }] }, // tête brûlée / posée
    { name: "Granit", styles: [{ tight: .88, aggro: .35, bluff: .03, skill: .72 }, { tight: .70, aggro: .62, bluff: .08, skill: .85 }] }, // roc / roc-agressif
    { name: "Ondine", styles: [{ tight: .25, aggro: .20, bluff: .05, skill: .35 }, { tight: .50, aggro: .45, bluff: .16, skill: .60 }] }, // suiveuse / maligne
    { name: "Druide", styles: [{ tight: .66, aggro: .40, bluff: .08, skill: .80 }, { tight: .42, aggro: .55, bluff: .22, skill: .55 }] }, // patient / joueur
    // Ligue
    { name: "Le Maître", styles: [{ tight: .60, aggro: .55, bluff: .12, skill: .95 }, { tight: .72, aggro: .82, bluff: .18, skill: .92 }] }, // solide / redoutable
    { name: "Agatha", styles: [{ tight: .45, aggro: .85, bluff: .38, skill: .55 }, { tight: .56, aggro: .50, bluff: .26, skill: .76 }] }, // bluffeuse / sournoise
    { name: "Olga",   styles: [{ tight: .72, aggro: .45, bluff: .06, skill: .82 }, { tight: .50, aggro: .66, bluff: .16, skill: .70 }] }, // glaciale / offensive
    { name: "Aldo",   styles: [{ tight: .30, aggro: .88, bluff: .20, skill: .50 }, { tight: .48, aggro: .90, bluff: .12, skill: .76 }] }, // bagarreur
    { name: "Peter",  styles: [{ tight: .55, aggro: .72, bluff: .22, skill: .86 }, { tight: .40, aggro: .60, bluff: .32, skill: .64 }] }, // dragon
]
const DEFAULT_PROFILE: BotProfile = { tight: .55, aggro: .55, bluff: .12, skill: .70 }

/** Noms des boss (pour le cash quotidien : itère dessus pour les tapis persistés). */
export const POKER_BOSS_NAMES: readonly string[] = POKER_BOSSES.map((b) => b.name)

/** Options de peuplement pour le CASH quotidien : boss ruinés du jour à EXCLURE + tapis PAR boss (persisté,
 *  cap sur les dons de la maison). Si `bossStackFor` est fourni, les bots ruinés ne sont PAS recavés. */
export interface EnsureBotsOpts { excludeNames?: readonly string[]; bossStackFor?: (name: string) => number }

/** Tire un boss ABSENT de la table (et hors `excludeNames`, ex. boss ruinés du jour) + UNE de ses 2
 *  personnalités (au hasard si rng). Renvoie null si aucun boss dispo. */
function pickBoss(t: PokerTable, rng?: Rng, excludeNames?: readonly string[]): { name: string; persona: BotProfile } | null {
    const used = new Set(t.seats.filter((s) => s.bot && !s.leaving).map((s) => s.name))
    const avail = POKER_BOSSES.filter((b) => !used.has(b.name) && !excludeNames?.includes(b.name))
    if (!avail.length) return null
    const boss = avail[rng ? Math.floor(rng.next() * avail.length) : 0]
    const persona = boss.styles[rng && rng.next() < 0.5 ? 1 : 0]
    return { name: boss.name, persona }
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
    const p = s.persona ?? DEFAULT_PROFILE     // style du bot (tiré au hasard à sa création, stocké sur le siège)
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
export function ensureBots(t: PokerTable, target = 4, maxSeats = 7, botBuyin = BOT_BUYIN, rng?: Rng, opts?: EnsureBotsOpts): void {
    if (t.phase !== "handComplete") return // ne jamais toucher la table en pleine main
    const humans = t.seats.filter((s) => !s.bot && !s.leaving)
    // Aucun humain → table au repos : on vire tous les bots (règle d'or : jamais de partie sans joueur).
    if (humans.length === 0) { for (const s of t.seats) if (s.bot) s.leaving = true; pruneSeats(t); return }

    const wanted = Math.max(0, Math.min(target, maxSeats) - humans.length)
    // Recave les bots ruinés — SAUF en cash (bossStackFor présent) : là un boss ruiné PART (géré par l'appelant).
    if (!opts?.bossStackFor) for (const s of t.seats) if (s.bot && s.stack <= 0) s.stack = botBuyin
    // Trop de bots (assez d'humains) → on en retire.
    const bots = t.seats.filter((s) => s.bot && !s.leaving)
    for (let k = wanted; k < bots.length; k++) bots[k].leaving = true
    // Pas assez → on en ajoute (ids stables bot_1..bot_N → persona + persistance entre les mains).
    for (let n = 1; n <= maxSeats && t.seats.filter((s) => s.bot && !s.leaving).length < wanted; n++) {
        const id = `bot_${n}`
        if (t.seats.some((s) => s.id === id && !s.leaving)) continue
        const pick = pickBoss(t, rng, opts?.excludeNames) // boss + persona au hasard (hors ruinés du jour)
        if (!pick) break // plus aucun boss dispo (tous ruinés / déjà assis)
        const stack = opts?.bossStackFor ? Math.max(0, Math.floor(opts.bossStackFor(pick.name))) : botBuyin
        t.seats.push({ id, name: pick.name, persona: pick.persona, stack, hole: [], folded: false, allIn: false, committed: 0, betThisRound: 0, hasActed: false, sittingOut: true, wantsSitOut: false, bot: true })
    }
    pruneSeats(t)
}
