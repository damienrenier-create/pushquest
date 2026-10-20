// src/lib/gamebook/yellow/poker/bots.ts
//
// Nexus — Poker : JOUEURS IA (comblent la table à ≥ MIN joueurs quand les potes ne sont pas tous là).
// - botDecision : décision fondée sur l'ÉQUITÉ réelle de la main (Monte-Carlo contre des mains inconnues), les
//   COTES DU POT et les TELLS de l'adversaire humain → fold/check/call/raise/allin. Le style (persona) module la
//   décision, il ne la remplace pas.
// - runBots : joue automatiquement TOUS les tours de bots consécutifs (côté serveur) jusqu'au tour d'un
//   humain ou la fin de main → aucun blocage quand c'est à un bot de parler.
// - ensureBots : ajuste le nb de bots ENTRE les mains (fill jusqu'à `target`, retire si assez d'humains,
//   recave les bots ruinés). Les bots = « la maison » : leurs jetons ne sont pas des reps (house-style).
//
// REFONTE 20/10/2026 (exploit de Jacanon, +48 612 ⚡ en 15 parties) — l'ancienne heuristique notait une main
// post-flop par sa seule CATÉGORIE (carte haute ≈ 0,06, paire ≈ 0,15) et comparait ça à un seuil de fold ≥ 0,12 :
// les boss se couchaient devant une mise de DEUX jetons dans un pot de 300, deux fois sur trois, et sur-misaient
// préflop (relances à 60 % du tapis avec R-9). La ligne « grosse relance préflop, puis mise minimale à chaque
// carte » rapportait 44 à 62 ⚡ par main (simulation, scratchpad/pokersim.ts). Désormais :
//   • la force d'une main = son ÉQUITÉ contre N mains au hasard (le bot ne voit QUE ses 2 cartes et le tableau) ;
//   • face à une mise, on compare l'équité aux cotes du pot : une mise minuscule se SUIT toujours — ou se RELANCE
//     si l'humain en abuse ;
//   • les mises sont dimensionnées sur le POT (½ à 1 pot, brouillées ±25 %), tapis seulement quand le pot le justifie ;
//   • AGRESSIVITÉ (Sartay : « encore plus agressives et intelligentes ») : ouvertures et sur-relances préflop,
//     continuation après avoir pris l'initiative, mises de valeur fines à la river, pièges (slow-play) ;
//   • ADAPTATION aux tells de l'humain (cf. engine.SeatTells) : couche souvent face aux relances → bluffé davantage ;
//     mises minuscules → relancées ; montre du vent à l'abattage → payé plus léger, moins bluffé ; relance préflop
//     presque toujours → sur-relancé plus large.
//   • le style ne crée plus de « trou » exploitable : le manque de discipline (skill bas) se traduit par des SUIVIS
//     de trop, jamais par des couchers devant rien.

import { Rng } from "../battle/rng"
import { act, legalActions, totalPot, type PokerAction, type PokerTable, type BotProfile, type SeatTells } from "./engine"
import { pruneSeats } from "./room"
import { evaluateBest, compareHands } from "./handEval"
import { makeDeck, type Card } from "./cards"

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

// ══════════════════ ÉQUITÉ (Monte-Carlo) ══════════════════
/** Échantillons par estimation : assez pour une décision stable, peu pour rester instantané (≈ 2 ms). */
export const EQUITY_SAMPLES_HEADS_UP = 80
export const EQUITY_SAMPLES_MULTI = 48

/** Équité ∈ [0,1] de `hole` + `community` contre `opponents` mains INCONNUES (tirées parmi les cartes non vues),
 *  tableau complété au hasard. Le bot ne lit JAMAIS les cartes adverses ni l'ordre du paquet : il n'utilise que ce
 *  qu'un joueur humain verrait. Déterministe pour un rng donné. Égalité = ½ point. */
export function handEquity(hole: readonly Card[], community: readonly Card[], opponents: number, rng: Rng, samples?: number): number {
    if (hole.length < 2) return 0
    const n = Math.max(1, Math.min(6, Math.floor(opponents)))
    const k = samples ?? (n === 1 ? EQUITY_SAMPLES_HEADS_UP : EQUITY_SAMPLES_MULTI)
    const known = new Set([...hole, ...community].map((c) => c.rank * 4 + c.suit))
    const unseen = makeDeck().filter((c) => !known.has(c.rank * 4 + c.suit))
    const need = 2 * n + (5 - community.length)
    let score = 0
    for (let s = 0; s < k; s++) {
        // Tirage partiel de Fisher-Yates : `need` cartes au hasard parmi les non-vues.
        for (let i = 0; i < need; i++) {
            const j = i + Math.floor(rng.next() * (unseen.length - i))
            const tmp = unseen[i]; unseen[i] = unseen[j]; unseen[j] = tmp
        }
        const board = [...community, ...unseen.slice(2 * n, need)]
        const mine = evaluateBest([...hole, ...board])
        let best = 1 // 1 = je gagne, 0.5 = partage, 0 = battu
        for (let o = 0; o < n && best > 0; o++) {
            const cmp = compareHands(mine, evaluateBest([unseen[2 * o], unseen[2 * o + 1], ...board]))
            if (cmp < 0) best = 0
            else if (cmp === 0 && best > 0.5) best = 0.5
        }
        score += best
    }
    return score / k
}

/** Adversaires encore en lice contre le siège `i` (pas couchés, dans la main). Au moins 1 (sinon la main est finie). */
function liveOpponents(t: PokerTable, i: number): number {
    return Math.max(1, t.seats.filter((s, k) => k !== i && !s.folded && !s.sittingOut).length)
}

// ══════════════════ LECTURE DES TELLS ══════════════════
/** Tendances de l'HUMAIN encore en lice contre `i` (cumulées s'ils sont plusieurs). Un taux vaut null tant que
 *  l'échantillon est trop court pour conclure. */
export interface TellsRead { tiny: number | null; fold: number | null; weak: number | null; preRaise: number | null }
export function readTells(t: PokerTable, i: number): TellsRead {
    const acc: SeatTells = { hands: 0, bets: 0, tinyBets: 0, faced: 0, foldsFacing: 0, showdowns: 0, weakShowdowns: 0, preRaises: 0 }
    for (const [k, s] of t.seats.entries()) {
        if (k === i || s.bot || s.folded || s.sittingOut || !s.tells) continue
        for (const key of Object.keys(acc) as (keyof SeatTells)[]) acc[key] += s.tells[key] ?? 0
    }
    const rate = (num: number, den: number, min: number) => (den >= min ? num / den : null)
    return { tiny: rate(acc.tinyBets, acc.bets, 5), fold: rate(acc.foldsFacing, acc.faced, 6), weak: rate(acc.weakShowdowns, acc.showdowns, 3), preRaise: rate(acc.preRaises, acc.hands, 8) }
}

/** Décision d'un bot pour le siège `i` (c'est son tour). */
export function botDecision(t: PokerTable, i: number, rng: Rng): PokerAction {
    const { canCheck, toCall, minRaiseTo, maxRaiseTo } = legalActions(t, i)
    const s = t.seats[i]
    const p = s.persona ?? DEFAULT_PROFILE     // style du bot (tiré au hasard à sa création, stocké sur le siège)
    const opps = liveOpponents(t, i)
    const eq = handEquity(s.hole, t.community, opps, rng)
    const r = rng.next()
    const r2 = rng.next() // 2e tirage : taille des mises et pièges — imprévisibilité (demande Sartay 20/10 : « plus imprévisibles »)
    const pot = totalPot(t)
    const canRaise = maxRaiseTo > minRaiseTo
    const bb = t.blinds.bb
    const heads = opps === 1
    const tells = readTells(t, i)
    // ADAPTATION : ce que l'humain a montré jusqu'ici module bluffs, valeur et seuils de paiement.
    const foldy = tells.fold !== null && tells.fold >= 0.55          // il se couche beaucoup face aux mises → on bluffe plus
    const station = tells.weak !== null && tells.weak >= 0.5         // il va à l'abattage avec rien → valeur plus fine, moins de bluff, on paie plus léger
    const minBetter = tells.tiny !== null && tells.tiny >= 0.5       // ses mises sont minuscules → on les relance
    const loosePre = tells.preRaise !== null && tells.preRaise >= 0.6 // il relance préflop presque toujours → on sur-relance plus large
    const bluffMult = (foldy ? 2 : 1) * (station ? 0.5 : 1)
    const valueShift = station ? -0.06 : 0
    const needShift = station ? -0.05 : 0
    // Mise « à » un total correspondant à `frac` × pot (pot APRÈS mon suivi), bornée aux relances légales. La taille est
    //   BROUILLÉE de ±25 % : la même main ne mise jamais deux fois pareil, on ne lit pas la force dans le montant.
    const betTo = (frac: number) => {
        const jitter = 0.75 + r2 * 0.5
        const target = s.betThisRound + toCall + Math.max(bb, Math.round((pot + toCall) * frac * jitter))
        return Math.max(minRaiseTo, Math.min(maxRaiseTo, target))
    }
    // Multiway, la même équité vaut moins : on relève légèrement les exigences par adversaire supplémentaire.
    const multi = (opps - 1) * 0.03
    // PIÈGE (slow-play) : avec une main écrasante, les bots posés checkent/suivent parfois pour laisser l'autre miser.
    const trapping = eq >= 0.85 && r2 < 0.15 + (1 - p.aggro) * 0.2

    if (canCheck) {
        if (t.phase === "preflop") {
            // Ouverture préflop : bonnes mains (équité ≥ ~48 % + sélectivité), taille 2-4 BB + 1 BB par limper ;
            //   de temps en temps un limp piège avec une main forte, ou une ouverture légère (bluff préflop) selon le style.
            const openAt = 0.48 + (p.tight - 0.5) * 0.12 + multi
            const limpers = t.seats.filter((x, k) => k !== i && !x.folded && !x.sittingOut && x.betThisRound > 0).length
            const openTo = () => Math.max(minRaiseTo, Math.min(maxRaiseTo, t.currentBet + bb * (2 + Math.round(r2 * 2) + limpers)))
            if (eq >= openAt && canRaise && r < 0.5 + p.aggro * 0.5 && !trapping) return { kind: "raise", to: openTo() }
            if (eq < openAt && eq >= 0.36 && canRaise && opps <= 2 && r < Math.min(0.6, p.bluff * 0.6 * bluffMult)) return { kind: "raise", to: openTo() } // ouverture légère
            return { kind: "check" }
        }
        // Post-flop sans mise à suivre.
        const valueAt = 0.56 + (p.tight - 0.5) * 0.08 + multi + valueShift
        // Mise de valeur avec une main qui domine (sauf piège).
        if (eq >= valueAt && canRaise && r < 0.6 + p.aggro * 0.4 && !trapping) return { kind: "raise", to: betTo(0.55 + p.aggro * 0.45) }
        // Valeur fine à la river en tête-à-tête : une main un peu meilleure que la moyenne se mise.
        if (t.phase === "river" && heads && eq >= 0.52 && eq < valueAt && canRaise && r < p.aggro * 0.5) return { kind: "raise", to: betTo(0.5)}
        // CONTINUATION au flop : j'ai pris l'initiative préflop → je continue souvent, avec un minimum d'équité — jamais
        //   contre un joueur qui paie tout (station) : on ne bluffe pas une station, on la fait payer.
        if (t.lastAggressor === i && t.phase === "flop" && opps <= 2 && eq >= 0.30 && !station && canRaise && r < Math.min(0.6, (0.35 + p.aggro * 0.3) * bluffMult)) return { kind: "raise", to: betTo(0.5) }
        // Bluff pur au rythme du style (tête-à-tête surtout, parfois à trois), jamais contre une station.
        if (eq < 0.40 && !station && canRaise && opps <= 2 && r < Math.min(0.6, p.bluff * (heads ? 0.8 : 0.4) * bluffMult)) return { kind: "raise", to: betTo(0.55 + r2 * 0.35) }
        return { kind: "check" }
    }

    // ── Face à une mise : cotes du pot contre équité. ──
    const potOdds = toCall / Math.max(1, pot + toCall)
    // Exigence : les cotes, plus une marge de sélectivité (tight), plus la pression multiway. Une mise minuscule
    //   (cotes ≈ 0) se suit toujours : il n'existe plus de « mise de 2 » qui fait fuir la table.
    const need = Math.max(0.03, Math.min(0.92, potOdds + (p.tight - 0.5) * 0.10 + multi + 0.02 + needShift))
    const allInCall = toCall >= s.stack
    const tinyBet = toCall <= Math.max(2 * bb, Math.floor(pot * 0.1))
    // PUNITION des mises minuscules : un humain qui mise 2 dans 300 à répétition se fait relancer POUR LA VALEUR dès qu'on
    //   est devant (≥ 55 %). Jamais en bluff : suivre une mise minuscule ne coûte rien et mène à l'abattage — c'est là
    //   qu'un « mise-mini » perd (relecture 20/10 : une relance avec 35 % d'équité le faisait GAGNER à l'abattage).
    if (tinyBet && minBetter && eq >= 0.55 && canRaise && r < 0.9) return { kind: "raise", to: betTo(0.9) }
    if (eq < need) {
        // Manque de discipline (skill bas) : suit parfois une main un peu courte — jamais un tapis sans rien.
        const slip = r > p.skill && eq > need * 0.75 && !allInCall
        if (slip) return { kind: "call" }
        return { kind: "fold" }
    }
    // Main nettement devant : relance (ou tapis quand le pot est déjà gros par rapport au tapis) — sauf piège (on suit
    //   pour relancer plus tard, « check-raise » naturel). Préflop face à un relanceur compulsif : on sur-relance plus
    //   large ; à la turn et à la river, on ne relance qu'avec une main solide (les gros pots se gagnent à l'abattage).
    const late = t.phase === "turn" || t.phase === "river"
    const raiseAt = t.phase === "preflop" && loosePre ? Math.max(0.56, need + 0.2) : late ? Math.max(0.70, need + 0.30) : Math.max(0.62, need + 0.26)
    if (eq >= raiseAt && canRaise && r < 0.4 + p.aggro * 0.55 && !trapping) {
        const to = betTo(t.phase === "preflop" ? 1.0 : 0.75 + p.aggro * 0.5)
        if (to >= s.betThisRound + s.stack * 0.6) return { kind: "allin" } // relance qui engage l'essentiel du tapis → tapis franc
        return { kind: "raise", to }
    }
    // Bluff-relance (jamais à la river, jamais contre une station) : sur une main correcte (semi-bluff) ou, plus rarement,
    //   sur du vent — au rythme du style, en tête-à-tête.
    if (t.phase !== "river" && !station && eq >= need + 0.10 && eq < raiseAt && canRaise && heads && r < Math.min(0.5, p.bluff * 0.45 * bluffMult)) return { kind: "raise", to: betTo(0.6 + r2 * 0.5) }
    if (t.phase !== "river" && !station && eq >= need && eq < need + 0.10 && canRaise && heads && potOdds < 0.3 && r < Math.min(0.3, p.bluff * 0.15 * bluffMult)) return { kind: "raise", to: betTo(0.8) }
    return allInCall ? { kind: "allin" } : { kind: "call" }
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
