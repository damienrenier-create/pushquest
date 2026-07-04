"use client"

// Nexus — Poker 1re partie : contrôleur SOLO LOCAL (aucun serveur / DB / réseau).
// Fait tourner le moteur PUR + les bots côté client, applique la triche (plafond 1000) avant chaque
// nouvelle main et le clawback à la sortie (cf. soloSession). Expose la MÊME interface que
// useCasinoPoker (+ quelques extras) → PokerPanel est réutilisé tel quel en mode solo.

import { useCallback, useMemo, useRef, useState } from "react"
import { Rng } from "../battle/rng"
import { createTable, act as engineAct, type PokerAction, type PokerTable } from "../poker/engine"
import { joinTable, leaveTable, maybeStartHand, publicView, setSitOut, type PublicTable } from "../poker/room"
import { ensureBots, runBots } from "../poker/bots"
import { applyFirstGameCheat, settleFirstGame } from "../poker/soloSession"
import type { PokerControls } from "./useCasinoPoker"

const SOLO_BLINDS = { sb: 1, bb: 2 }
const SOLO_SEATS = 4 // toi + 3 bots

export interface LocalPokerControls extends PokerControls {
    firstHandDone: boolean        // ≥ 1 main jouée jusqu'au bout (obligation de jouer avant de partir)
    cheatNote: string | null      // dernier message de triche de la maison (éphémère, à afficher)
    settleInfo: { cheatTaken: number; repay: number; kept: number } | null // récap affiché à la sortie
}

export function useLocalPoker(myUserId: string, myName: string): LocalPokerControls {
    const tableRef = useRef<PokerTable | null>(null)
    const rngRef = useRef<Rng | null>(null)
    const firstHandRef = useRef(false)
    const [view, setView] = useState<PublicTable | null>(null)
    const [firstHandDone, setFirstHandDone] = useState(false)
    const [cheatNote, setCheatNote] = useState<string | null>(null)
    const [settleInfo, setSettleInfo] = useState<{ cheatTaken: number; repay: number; kept: number } | null>(null)

    const rng = () => { if (!rngRef.current) rngRef.current = new Rng((Date.now() & 0x7fffffff) >>> 0); return rngRef.current }
    const mySeat = (t: PokerTable) => t.seats.find((s) => s.id === myUserId) ?? null

    const sync = useCallback(() => {
        const t = tableRef.current
        if (!t) { setView(null); return }
        if (t.phase === "handComplete" && t.handId >= 1 && !firstHandRef.current) { firstHandRef.current = true; setFirstHandDone(true) }
        setView(publicView(t, myUserId))
    }, [myUserId])

    const join = useCallback(async (buyin: number): Promise<boolean> => {
        let t = tableRef.current
        if (!t) { t = createTable([], SOLO_BLINDS); tableRef.current = t }
        if (mySeat(t)) return false
        joinTable(t, { id: myUserId, name: myName, buyin: Math.max(0, Math.floor(buyin)) })
        ensureBots(t, SOLO_SEATS, SOLO_SEATS)
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
        // TRICHE : au-dessus du plafond, la maison reprend l'excédent AVANT la main suivante.
        const me = mySeat(t)
        if (me) {
            const { stack, taken } = applyFirstGameCheat(me.stack)
            if (taken > 0) { me.stack = stack; setCheatNote(`😈 La maison a triché : elle te reprend ${taken} ⚡ (plafond 1000).`) }
        }
        ensureBots(t, SOLO_SEATS, SOLO_SEATS)
        maybeStartHand(t, rng())
        runBots(t, rng())
        sync()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sync])

    const leave = useCallback(async (): Promise<number> => {
        const t = tableRef.current; if (!t) return 0
        const finalStack = mySeat(t)?.stack ?? 0
        const s = settleFirstGame(finalStack)
        setSettleInfo({ cheatTaken: s.cheatTaken, repay: s.repay, kept: s.kept })
        leaveTable(t, myUserId)
        sync()
        return s.kept // reps NETS à créditer (house-funded → le joueur ne fait qu'encaisser, jamais perdre)
    }, [myUserId, sync])

    const sit = useCallback(async (out: boolean): Promise<void> => { const t = tableRef.current; if (t) { setSitOut(t, myUserId, out); sync() } }, [myUserId, sync])
    const noop = useCallback(async () => { /* rebuy désactivé en 1re partie */ }, [])
    const refresh = useCallback(async () => { sync() }, [sync])

    return useMemo(() => ({
        table: view, busy: false, join, act, sit, rebuy: noop, nextHand, leave, refresh,
        firstHandDone, cheatNote, settleInfo,
    }), [view, join, act, sit, noop, nextHand, leave, refresh, firstHandDone, cheatNote, settleInfo])
}
