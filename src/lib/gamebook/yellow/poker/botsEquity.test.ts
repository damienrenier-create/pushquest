import { describe, it, expect } from "vitest"
import { createTable, startHand, act, legalActions, totalPot, type PokerTable, type PokerAction, type BotProfile } from "./engine"
import { botDecision, handEquity } from "./bots"
import { evaluateBest } from "./handEval"
import { Rng } from "../battle/rng"
import type { Card } from "./cards"

// ═══════ REFONTE DES BOTS (20/10/2026) — l'exploit de Jacanon (+48 612 ⚡ en 15 parties) ═══════
// Les boss notaient une main post-flop par sa seule catégorie et se couchaient devant une mise de DEUX jetons dans
// un pot de 300 (2 fois sur 3). Ils jouent désormais à l'ÉQUITÉ et aux COTES DU POT. Ces tests fixent ce contrat.
// Les décisions font du Monte-Carlo (≈ 2-3 ms) : les simulations ont un délai explicite.

const DEFAULT: BotProfile = { tight: .55, aggro: .55, bluff: .12, skill: .70 }
const C = (rank: number, suit: 0 | 1 | 2 | 3): Card => ({ rank, suit })
// Sièges : le BOT en 0, MOI en 1 → à la 1re main le bouton (= petite blinde en tête-à-tête, 1er à parler) est MOI.
const BOT = 0, ME = 1
const headsUp = (seed: number, profile = DEFAULT) => {
    const t = createTable([{ id: "bot_1", name: "Bot", stack: 2500 }, { id: "me", name: "Moi", stack: 2500 }], { sb: 1, bb: 2 })
    t.seats[BOT].bot = true; t.seats[BOT].persona = profile
    startHand(t, new Rng(seed))
    return t
}
const live = (t: PokerTable) => t.phase === "preflop" || t.phase === "flop" || t.phase === "turn" || t.phase === "river"
const SLOW = 60_000

describe("handEquity — équité Monte-Carlo contre des mains inconnues", () => {
    it("As-As écrase, 7-2 dépareillé rame, et plus d'adversaires = moins d'équité", () => {
        const rng = new Rng(7)
        const aa = handEquity([C(14, 0), C(14, 1)], [], 1, rng, 400)
        const junk = handEquity([C(7, 0), C(2, 1)], [], 1, rng, 400)
        const aa5 = handEquity([C(14, 0), C(14, 1)], [], 5, rng, 400)
        expect(aa).toBeGreaterThan(0.78)
        expect(junk).toBeLessThan(0.42)
        expect(aa5).toBeLessThan(aa)
        expect(aa5).toBeGreaterThan(0.40)
    }, SLOW)
    it("avec le tableau : brelan servi ≈ gagnant, carte haute ≈ perdante ; déterministe pour un même rng", () => {
        const board = [C(9, 2), C(5, 3), C(2, 0)]
        const set = handEquity([C(9, 0), C(9, 1)], board, 1, new Rng(3), 300)
        const air = handEquity([C(11, 0), C(4, 1)], board, 1, new Rng(3), 300)
        expect(set).toBeGreaterThan(0.9)
        expect(air).toBeLessThan(0.5)
        expect(handEquity([C(9, 0), C(9, 1)], board, 1, new Rng(3), 300)).toBe(set)
    }, SLOW)
})

describe("botDecision — plus de trou face à une mise minuscule, respect des cotes", () => {
    it("⚠️ face à une mise de 2 dans un pot de 300, le bot se couche moins de 5 % du temps (avant : 67 %)", () => {
        let folds = 0, n = 0
        for (let seed = 1; seed <= 120; seed++) {
            const t = headsUp(seed)
            // On projette la table au flop avec un gros pot et une mise minuscule à suivre pour le bot.
            t.phase = "flop"; t.community = [t.deck.pop()!, t.deck.pop()!, t.deck.pop()!]
            t.seats[ME].committed = 152; t.seats[ME].betThisRound = 2
            t.seats[BOT].committed = 150; t.seats[BOT].betThisRound = 0
            t.currentBet = 2; t.minRaise = 2; t.toAct = BOT
            expect(legalActions(t, BOT).toCall).toBe(2)
            expect(totalPot(t)).toBe(302)
            const a = botDecision(t, BOT, new Rng(seed * 31))
            n++; if (a.kind === "fold") folds++
        }
        expect(folds / n).toBeLessThan(0.05)
    }, SLOW)
    it("face à un TAPIS préflop (2 500 dans un pot de 3) : se couche avec 7-2, s'engage avec As-As", () => {
        let foldJunk = 0, callAces = 0
        for (let seed = 1; seed <= 40; seed++) {
            const t = headsUp(seed)
            expect(t.toAct).toBe(ME) // bouton = petite blinde = moi : je parle en premier
            act(t, ME, { kind: "allin" })
            expect(t.toAct).toBe(BOT)
            t.seats[BOT].hole = [C(7, 0), C(2, 1)]
            if (botDecision(t, BOT, new Rng(seed)).kind === "fold") foldJunk++
            t.seats[BOT].hole = [C(14, 0), C(14, 1)]
            const a = botDecision(t, BOT, new Rng(seed)).kind
            if (a === "call" || a === "allin") callAces++
        }
        expect(foldJunk).toBeGreaterThanOrEqual(38)
        expect(callAces).toBeGreaterThanOrEqual(38)
    }, SLOW)
    it("les mises sont dimensionnées sur le pot : jamais de sur-mise délirante hors tapis (avant : 60 % du tapis avec R-9)", () => {
        let raises = 0, huge = 0
        for (let seed = 1; seed <= 150; seed++) {
            const t = headsUp(seed, { tight: .30, aggro: .95, bluff: .25, skill: .50 }) // le plus agressif possible
            let guard = 0
            while (live(t) && t.toAct >= 0 && guard++ < 60) {
                const i = t.toAct
                if (i === BOT) {
                    const a = botDecision(t, BOT, new Rng(seed * 7 + guard))
                    if (a.kind === "raise" && a.to !== undefined) {
                        const { toCall } = legalActions(t, BOT)
                        const added = a.to - t.seats[BOT].betThisRound - toCall
                        raises++; if (added > (totalPot(t) + toCall) * 2 + 4) huge++
                    }
                    act(t, BOT, a)
                } else act(t, ME, legalActions(t, ME).canCheck ? { kind: "check" } : { kind: "call" })
            }
        }
        expect(raises).toBeGreaterThan(50)
        expect(huge).toBe(0)
    }, SLOW)
    it("le style reste visible : un bluffeur relance plus souvent sans main qu'un roc", () => {
        const countBluffs = (profile: BotProfile) => {
            let bluffs = 0
            for (let seed = 1; seed <= 150; seed++) {
                const t = headsUp(seed, profile)
                t.phase = "flop"; t.community = [C(13, 0), C(8, 1), C(3, 2)]
                t.seats[BOT].hole = [C(6, 3), C(2, 3)] // du vent
                t.seats[ME].committed = 40; t.seats[BOT].committed = 40; t.currentBet = 0; t.toAct = BOT
                if (botDecision(t, BOT, new Rng(seed)).kind === "raise") bluffs++
            }
            return bluffs
        }
        const agatha = countBluffs({ tight: .45, aggro: .85, bluff: .38, skill: .55 })
        const granit = countBluffs({ tight: .88, aggro: .35, bluff: .03, skill: .72 })
        expect(agatha).toBeGreaterThan(granit + 10)
    }, SLOW)
})

describe("tells — le moteur observe l'humain, les bots s'adaptent (Sartay 20/10 : « plus intelligentes »)", () => {
    it("une relance minuscule est comptée comme telle ; se coucher face à une mise aussi ; le dernier agresseur est mémorisé", () => {
        const t = headsUp(5)
        act(t, ME, { kind: "raise", to: 4 }) // préflop : 2 de plus dans un pot de 3 → minuscule (≤ 2 BB)
        expect(t.seats[ME].tells).toMatchObject({ hands: 1, bets: 1, tinyBets: 1, preRaises: 1 })
        expect(t.lastAggressor).toBe(ME)
        if (t.toAct === BOT) act(t, BOT, { kind: "raise", to: 40 })
        if (t.toAct === ME) act(t, ME, { kind: "fold" })
        expect(t.seats[ME].tells).toMatchObject({ faced: 2, foldsFacing: 1 }) // faced : la grosse blinde préflop, puis la sur-relance
        expect(t.seats[BOT].tells).toBeUndefined() // on n'observe jamais un bot
    })
    it("⚠️ un humain qui mise toujours 2 jetons se fait RELANCER par les bots (punition des mises minuscules)", () => {
        const punishRate = (tinyBets: number) => {
            let raises = 0
            for (let seed = 1; seed <= 120; seed++) {
                const t = headsUp(seed)
                t.phase = "flop"; t.community = [t.deck.pop()!, t.deck.pop()!, t.deck.pop()!]
                t.seats[ME].committed = 152; t.seats[ME].betThisRound = 2
                t.seats[BOT].committed = 150; t.seats[BOT].betThisRound = 0
                t.seats[ME].tells = { hands: 20, bets: 10, tinyBets, faced: 0, foldsFacing: 0, showdowns: 0, weakShowdowns: 0, preRaises: 0 }
                t.currentBet = 2; t.minRaise = 2; t.toAct = BOT
                if (botDecision(t, BOT, new Rng(seed * 13)).kind === "raise") raises++
            }
            return raises / 120
        }
        expect(punishRate(10)).toBeGreaterThan(punishRate(0) + 0.06) // relance pour la valeur seulement (≥ 55 % d'équité)
    }, SLOW)
    it("un humain qui se couche souvent face aux mises est bluffé davantage", () => {
        const bluffRate = (foldsFacing: number) => {
            let bluffs = 0
            for (let seed = 1; seed <= 120; seed++) {
                const t = headsUp(seed, { tight: .5, aggro: .5, bluff: .2, skill: .7 })
                t.phase = "turn"; t.community = [C(13, 0), C(8, 1), C(3, 2), C(10, 3)]
                t.seats[BOT].hole = [C(6, 3), C(2, 3)] // du vent
                t.seats[ME].tells = { hands: 20, bets: 2, tinyBets: 0, faced: 10, foldsFacing, showdowns: 0, weakShowdowns: 0, preRaises: 0 }
                t.seats[ME].committed = 40; t.seats[BOT].committed = 40; t.currentBet = 0; t.toAct = BOT
                if (botDecision(t, BOT, new Rng(seed)).kind === "raise") bluffs++
            }
            return bluffs / 120
        }
        expect(bluffRate(9)).toBeGreaterThan(bluffRate(1) + 0.1)
    }, SLOW)
})

describe("⚠️ la ligne de Jacanon perd désormais (simulation tête-à-tête, 200 mains, tapis rechargés)", () => {
    const jacanon = (t: PokerTable, i: number): PokerAction => {
        const { canCheck, toCall, minRaiseTo, maxRaiseTo } = legalActions(t, i)
        const canRaise = maxRaiseTo > minRaiseTo
        if (t.phase === "preflop") {
            if (canCheck || toCall <= t.blinds.bb) { const to = Math.min(maxRaiseTo - 1, Math.max(minRaiseTo, 150)); return canRaise && to >= minRaiseTo ? { kind: "raise", to } : { kind: "call" } }
            return toCall < t.seats[i].stack * 0.5 ? { kind: "call" } : { kind: "fold" }
        }
        if (canCheck) return canRaise ? { kind: "raise", to: Math.min(minRaiseTo, maxRaiseTo) } : { kind: "check" }
        const cat = evaluateBest([...t.seats[i].hole, ...t.community]).category
        return cat >= 1 ? { kind: "call" } : { kind: "fold" }
    }
    it("grosse relance préflop puis mise de 2 à chaque carte : nettement négatif (avant la refonte : +44 ⚡ par main)", () => {
        const rng = new Rng(2026)
        const t = createTable([{ id: "bot_1", name: "Bot", stack: 2500 }, { id: "me", name: "Moi", stack: 2500 }], { sb: 1, bb: 2 })
        t.seats[BOT].bot = true; t.seats[BOT].persona = DEFAULT
        let net = 0
        const HANDS = 200
        for (let h = 0; h < HANDS; h++) {
            for (const s of t.seats) s.stack = 2500
            startHand(t, rng)
            let guard = 0
            while (live(t) && t.toAct >= 0 && guard++ < 200) {
                const i = t.toAct
                act(t, i, i === BOT ? botDecision(t, BOT, rng) : jacanon(t, ME))
            }
            net += t.seats[ME].stack - 2500
        }
        expect(net / HANDS).toBeLessThan(-5)
    }, SLOW)
})
