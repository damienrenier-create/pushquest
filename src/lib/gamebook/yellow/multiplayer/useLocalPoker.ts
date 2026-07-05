"use client"

// Nexus — Poker 1re partie : contrôleur SOLO LOCAL (aucun serveur / DB / réseau).
// Moteur PUR + bots côté client. Les bots jouent au MÊME plafond que le buy-in du joueur (partie juste).
// Les bots agissent UN PAR UN via botTurn() → le PANNEAU pilote le TEMPO (délais, paroles, suspense).
// Filet SECRET (jamais annoncé) : au-dessus de 1000 ⚡, la donne du joueur est discrètement défavorisée →
// il redescend « naturellement » (ressenti = malchance). Clawback à la sortie (soloSession). Reps jamais débités.

import { useCallback, useMemo, useRef, useState } from "react"
import { Rng } from "../battle/rng"
import { createTable, act as engineAct, type PokerAction, type PokerTable } from "../poker/engine"
import { joinTable, leaveTable, maybeStartHand, publicView, setSitOut, type PublicTable } from "../poker/room"
import { ensureBots, botDecision } from "../poker/bots"
import { settleFirstGame, FIRST_GAME_CHEAT_CAP } from "../poker/soloSession"
import type { PokerControls } from "./useCasinoPoker"

const SOLO_BLINDS = { sb: 1, bb: 2 }
const SOLO_SEATS = 4 // toi + 3 bots

/** Ce qu'un bot vient de faire (pour la bulle de « chat » au-dessus de son siège). */
export interface BotSay { seat: number; text: string }

export interface LocalPokerControls extends PokerControls {
    firstHandDone: boolean        // ≥ 1 main jouée jusqu'au bout (obligation de jouer avant de partir)
    settleInfo: { repay: number; kept: number } | null // récap de sortie (SANS révéler le filet secret)
    /** Joue UNE action de bot si c'est au tour d'un bot (main live). Renvoie ce qu'il a dit, sinon null. */
    botTurn: () => BotSay | null
}

function describeAction(a: PokerAction): string {
    switch (a.kind) {
        case "fold": return "se couche"
        case "check": return "check"
        case "call": return "suit"
        case "raise": return `relance à ${a.to}`
        case "allin": return "TAPIS !"
        default: return ""
    }
}

export function useLocalPoker(myUserId: string, myName: string): LocalPokerControls {
    const tableRef = useRef<PokerTable | null>(null)
    const rngRef = useRef<Rng | null>(null)
    const firstHandRef = useRef(false)
    const buyinRef = useRef(0)
    const [view, setView] = useState<PublicTable | null>(null)
    const [firstHandDone, setFirstHandDone] = useState(false)
    const [settleInfo, setSettleInfo] = useState<{ repay: number; kept: number } | null>(null)

    const rng = () => { if (!rngRef.current) rngRef.current = new Rng((Date.now() & 0x7fffffff) >>> 0); return rngRef.current }
    const mySeat = (t: PokerTable) => t.seats.find((s) => s.id === myUserId) ?? null

    const sync = useCallback(() => {
        const t = tableRef.current
        if (!t) { setView(null); return }
        if (t.phase === "handComplete" && t.handId >= 1 && !firstHandRef.current) { firstHandRef.current = true; setFirstHandDone(true) }
        setView(publicView(t, myUserId))
    }, [myUserId])

    // SECRET (jamais annoncé) : au-dessus du plafond, on donne au joueur les 2 cartes les + faibles du
    // paquet → main pourrie ; il perd face aux bots et redescend. Ressenti = malchance, aucune triche visible.
    const rigWeakHand = useCallback((t: PokerTable) => {
        const me = mySeat(t)
        if (!me || me.hole.length < 2 || t.deck.length < 4) return
        const order = t.deck.map((_, i) => i).sort((a, b) => t.deck[a].rank - t.deck[b].rank)
        const weakIdx = [order[0], order[1]]
        const weak = [t.deck[weakIdx[0]], t.deck[weakIdx[1]]]
        for (const i of [...weakIdx].sort((a, b) => b - a)) t.deck.splice(i, 1)
        t.deck.push(me.hole[0], me.hole[1])
        me.hole = weak
    }, [myUserId]) // eslint-disable-line react-hooks/exhaustive-deps

    const isLive = (t: PokerTable) => t.phase === "preflop" || t.phase === "flop" || t.phase === "turn" || t.phase === "river"

    const join = useCallback(async (buyin: number): Promise<boolean> => {
        let t = tableRef.current
        if (!t) { t = createTable([], SOLO_BLINDS); tableRef.current = t }
        if (mySeat(t)) return false
        const bi = Math.max(0, Math.floor(buyin))
        buyinRef.current = bi
        joinTable(t, { id: myUserId, name: myName, buyin: bi })
        ensureBots(t, SOLO_SEATS, SOLO_SEATS, bi) // bots au MÊME plafond que le joueur (partie juste)
        maybeStartHand(t, rng())
        sync() // les bots joueront ensuite un par un (botTurn), piloté par le panneau
        return true
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [myUserId, myName, sync])

    const act = useCallback(async (move: PokerAction): Promise<void> => {
        const t = tableRef.current; if (!t) return
        const i = t.seats.findIndex((s) => s.id === myUserId)
        if (i >= 0 && t.toAct === i) engineAct(t, i, move) // pas de runBots : le panneau enchaîne les bots au tempo
        sync()
    }, [myUserId, sync])

    const botTurn = useCallback((): BotSay | null => {
        const t = tableRef.current
        if (!t || !isLive(t) || t.toAct < 0) return null
        const i = t.toAct
        const s = t.seats[i]
        if (!s || !s.bot) return null // au tour d'un humain → on rend la main
        const action = botDecision(t, i, rng())
        engineAct(t, i, action)
        sync()
        return { seat: i, text: describeAction(action) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sync])

    const nextHand = useCallback(async (): Promise<void> => {
        const t = tableRef.current; if (!t || t.phase !== "handComplete") { sync(); return }
        const overCap = (mySeat(t)?.stack ?? 0) > FIRST_GAME_CHEAT_CAP // au-dessus du plafond AVANT la donne
        ensureBots(t, SOLO_SEATS, SOLO_SEATS, buyinRef.current)
        maybeStartHand(t, rng())
        if (overCap) rigWeakHand(t) // SECRET : donne défavorisée, jamais annoncée
        sync()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sync, rigWeakHand])

    const leave = useCallback(async (): Promise<number> => {
        const t = tableRef.current; if (!t) return 0
        const finalStack = mySeat(t)?.stack ?? 0
        const s = settleFirstGame(finalStack)
        setSettleInfo({ repay: s.repay, kept: s.kept })
        leaveTable(t, myUserId)
        sync()
        return s.kept
    }, [myUserId, sync])

    const sit = useCallback(async (out: boolean): Promise<void> => { const t = tableRef.current; if (t) { setSitOut(t, myUserId, out); sync() } }, [myUserId, sync])
    const noop = useCallback(async () => { /* rebuy désactivé en 1re partie */ }, [])
    const refresh = useCallback(async () => { sync() }, [sync])

    return useMemo(() => ({
        table: view, busy: false, join, act, sit, rebuy: noop, nextHand, leave, refresh,
        firstHandDone, settleInfo, botTurn,
    }), [view, join, act, sit, noop, nextHand, leave, refresh, firstHandDone, settleInfo, botTurn])
}
