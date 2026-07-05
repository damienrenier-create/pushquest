"use client"

// Nexus — Poker CASH QUOTIDIEN vs les boss (SOLO local, VRAIES reps). 6 sièges (toi + 5 boss).
// Les boss ont un tapis DU JOUR persistant : cap sur les DONS de la maison = ton buy-in, mais leurs GAINS
// restent acquis (cf. cashGame.bossStartStack). Un boss RUINÉ (tapis 0) part et ne revient que le lendemain.
// Aucune triche (vrai cash game). Règle d'or : jamais de partie sans toi à table (ensureBots l'impose).
// Les bots jouent UN PAR UN (botTurn) → tempo piloté par le panneau.

import { useCallback, useMemo, useRef, useState } from "react"
import { Rng } from "../battle/rng"
import { createTable, act as engineAct, type PokerAction, type PokerTable } from "../poker/engine"
import { joinTable, leaveTable, maybeStartHand, publicView, type PublicTable } from "../poker/room"
import { ensureBots, botDecision, POKER_BOSS_NAMES } from "../poker/bots"
import { bossStartStack, CASH_SEATS } from "../poker/cashGame"
import type { BotSay } from "./useLocalPoker"

const CASH_BLINDS = { sb: 1, bb: 2 }

export interface CashPokerControls {
    table: PublicTable | null
    joinCash: (buyin: number, cap: number, bossStacks: Record<string, number>) => void
    act: (move: PokerAction) => void
    botTurn: () => BotSay | null
    nextHand: () => void
    /** Quitte : renvoie ton tapis (à créditer) + les tapis FINAUX des boss (à persister). */
    leaveCash: () => { playerTapis: number; bossStacks: Record<string, number> }
    bossBustNote: string | null   // dernier(s) boss ruiné(s) ce coup-ci (notif)
    bossesLeft: number            // nb de boss encore à table (0 → tous ruinés, la journée est finie)
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
const isLive = (t: PokerTable) => t.phase === "preflop" || t.phase === "flop" || t.phase === "turn" || t.phase === "river"

export function useCashPoker(myUserId: string, myName: string): CashPokerControls {
    const tableRef = useRef<PokerTable | null>(null)
    const rngRef = useRef<Rng | null>(null)
    const cashRef = useRef<{ cap: number; bossStacks: Record<string, number> }>({ cap: 0, bossStacks: {} })
    const [view, setView] = useState<PublicTable | null>(null)
    const [bossBustNote, setBossBustNote] = useState<string | null>(null)

    const rng = () => { if (!rngRef.current) rngRef.current = new Rng((Date.now() & 0x7fffffff) >>> 0); return rngRef.current }

    // Capture les tapis courants des boss (pour persistance). Les ruinés (0) sont figés avant le prune.
    const capture = (t: PokerTable) => { for (const s of t.seats) if (s.bot) cashRef.current.bossStacks[s.name] = Math.max(0, Math.floor(s.stack)) }

    const sync = useCallback(() => { const t = tableRef.current; setView(t ? publicView(t, myUserId) : null) }, [myUserId])

    const joinCash = useCallback((buyin: number, cap: number, bossStacks: Record<string, number>) => {
        const t = createTable([], CASH_BLINDS); tableRef.current = t
        cashRef.current = { cap, bossStacks: { ...bossStacks } }
        const bi = Math.max(1, Math.floor(buyin))
        joinTable(t, { id: myUserId, name: myName, buyin: bi })
        const busted = POKER_BOSS_NAMES.filter((n) => bossStacks[n] === 0) // ruinés aujourd'hui → exclus
        ensureBots(t, CASH_SEATS, CASH_SEATS, bi, rng(), {
            excludeNames: busted,
            bossStackFor: (name) => bossStartStack(bossStacks[name], cap) ?? Math.max(1, cap),
        })
        capture(t)
        maybeStartHand(t, rng())
        sync()
    }, [myUserId, myName, sync])

    const act = useCallback((move: PokerAction) => {
        const t = tableRef.current; if (!t) return
        const i = t.seats.findIndex((s) => s.id === myUserId)
        if (i >= 0 && t.toAct === i) engineAct(t, i, move)
        capture(t); sync()
    }, [myUserId, sync])

    const botTurn = useCallback((): BotSay | null => {
        const t = tableRef.current
        if (!t || !isLive(t) || t.toAct < 0) return null
        const i = t.toAct; const s = t.seats[i]
        if (!s || !s.bot) return null
        const action = botDecision(t, i, rng())
        engineAct(t, i, action)
        capture(t); sync()
        return { seat: i, text: describeAction(action) }
    }, [sync])

    const nextHand = useCallback(() => {
        const t = tableRef.current; if (!t || t.phase !== "handComplete") { sync(); return }
        capture(t)
        // Boss RUINÉS (tapis 0) → figés out-du-jour + quittent (pas de recave, pas de refill : ils reviennent demain).
        const busted: string[] = []
        for (const s of t.seats) if (s.bot && s.stack <= 0 && !s.leaving) { s.leaving = true; cashRef.current.bossStacks[s.name] = 0; busted.push(s.name) }
        if (busted.length) setBossBustNote(`💥 ${busted.join(", ")} ${busted.length > 1 ? "sont ruinés — reviennent" : "est ruiné — revient"} demain !`)
        maybeStartHand(t, rng()) // prune les ruinés + relance si ≥2 joueurs restent (sinon journée finie)
        sync()
    }, [sync])

    const leaveCash = useCallback(() => {
        const t = tableRef.current
        if (!t) return { playerTapis: 0, bossStacks: cashRef.current.bossStacks }
        capture(t)
        const playerTapis = Math.max(0, Math.floor(t.seats.find((s) => s.id === myUserId)?.stack ?? 0))
        leaveTable(t, myUserId); sync()
        return { playerTapis, bossStacks: cashRef.current.bossStacks }
    }, [myUserId, sync])

    const bossesLeft = view ? view.seats.filter((s) => s.bot).length : 0

    return useMemo(() => ({ table: view, joinCash, act, botTurn, nextHand, leaveCash, bossBustNote, bossesLeft }),
        [view, joinCash, act, botTurn, nextHand, leaveCash, bossBustNote, bossesLeft])
}
