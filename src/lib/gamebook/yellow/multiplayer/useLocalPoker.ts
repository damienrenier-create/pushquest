"use client"

// Nexus — Poker 1re partie : contrôleur SOLO LOCAL (aucun serveur / DB / réseau).
// Moteur PUR + bots côté client. Les bots jouent au MÊME plafond que le buy-in du joueur (partie juste).
// SECRET (jamais annoncé) : au-dessus de 1000 ⚡, la donne du joueur est discrètement défavorisée (mains
// faibles) → il redescend « naturellement », ressenti comme de la malchance. Clawback à la sortie
// (soloSession). Les reps du joueur ne sont JAMAIS débités : il ne fait qu'encaisser.

import { useCallback, useMemo, useRef, useState } from "react"
import { Rng } from "../battle/rng"
import { createTable, act as engineAct, type PokerAction, type PokerTable } from "../poker/engine"
import { joinTable, leaveTable, maybeStartHand, publicView, setSitOut, type PublicTable } from "../poker/room"
import { ensureBots, runBots } from "../poker/bots"
import { settleFirstGame, FIRST_GAME_CHEAT_CAP } from "../poker/soloSession"
import type { PokerControls } from "./useCasinoPoker"

const SOLO_BLINDS = { sb: 1, bb: 2 }
const SOLO_SEATS = 4 // toi + 3 bots

export interface LocalPokerControls extends PokerControls {
    firstHandDone: boolean        // ≥ 1 main jouée jusqu'au bout (obligation de jouer avant de partir)
    settleInfo: { repay: number; kept: number } | null // récap affiché à la sortie (SANS révéler le plafond secret)
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
        for (const i of [...weakIdx].sort((a, b) => b - a)) t.deck.splice(i, 1) // retire du + grand index au + petit
        t.deck.push(me.hole[0], me.hole[1]) // ses bonnes cartes retournent dans le paquet (pour le board)
        me.hole = weak
    }, [myUserId]) // eslint-disable-line react-hooks/exhaustive-deps

    const join = useCallback(async (buyin: number): Promise<boolean> => {
        let t = tableRef.current
        if (!t) { t = createTable([], SOLO_BLINDS); tableRef.current = t }
        if (mySeat(t)) return false
        const bi = Math.max(0, Math.floor(buyin))
        buyinRef.current = bi
        joinTable(t, { id: myUserId, name: myName, buyin: bi })
        ensureBots(t, SOLO_SEATS, SOLO_SEATS, bi) // bots au MÊME plafond que le joueur (partie juste)
        maybeStartHand(t, rng())
        runBots(t, rng())
        sync()
        return true
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [myUserId, myName, sync])

    const act = useCallback(async (move: PokerAction): Promise<void> => {
        const t = tableRef.current; if (!t) return
        const i = t.seats.findIndex((s) => s.id === myUserId)
        if (i >= 0 && t.toAct === i) { engineAct(t, i, move); runBots(t, rng()) }
        sync()
    }, [myUserId, sync])

    const nextHand = useCallback(async (): Promise<void> => {
        const t = tableRef.current; if (!t || t.phase !== "handComplete") { sync(); return }
        const overCap = (mySeat(t)?.stack ?? 0) > FIRST_GAME_CHEAT_CAP // au-dessus du plafond AVANT la donne
        ensureBots(t, SOLO_SEATS, SOLO_SEATS, buyinRef.current)
        maybeStartHand(t, rng())
        if (overCap) rigWeakHand(t) // SECRET : donne défavorisée, jamais annoncée
        runBots(t, rng())
        sync()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sync, rigWeakHand])

    const leave = useCallback(async (): Promise<number> => {
        const t = tableRef.current; if (!t) return 0
        const finalStack = mySeat(t)?.stack ?? 0
        const s = settleFirstGame(finalStack) // plafonne (silencieux) puis applique le clawback (règle connue)
        setSettleInfo({ repay: s.repay, kept: s.kept })
        leaveTable(t, myUserId)
        sync()
        return s.kept // reps NETS à créditer (house-funded → le joueur ne fait qu'encaisser)
    }, [myUserId, sync])

    const sit = useCallback(async (out: boolean): Promise<void> => { const t = tableRef.current; if (t) { setSitOut(t, myUserId, out); sync() } }, [myUserId, sync])
    const noop = useCallback(async () => { /* rebuy désactivé en 1re partie */ }, [])
    const refresh = useCallback(async () => { sync() }, [sync])

    return useMemo(() => ({
        table: view, busy: false, join, act, sit, rebuy: noop, nextHand, leave, refresh,
        firstHandDone, settleInfo,
    }), [view, join, act, sit, noop, nextHand, leave, refresh, firstHandDone, settleInfo])
}
