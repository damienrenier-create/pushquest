"use client"

// Nexus — Poker multijoueur : hook client TEMPS RÉEL.
// S'abonne au canal Pusher `gamebook-yellow_poker` → à chaque event `update`, re-fetch SA vue redactée
// (GET /api/gamebook/yellow/poker : uniquement SES cartes). Polling de secours si Pusher indisponible.
// Expose les actions (join/act/sit/rebuy/next/leave) qui POSTent sur la route et rafraîchissent l'état.

import { useEffect, useRef, useState, useCallback } from "react"
import { getPusherClient, PUSHER_CLIENT_ENABLED } from "@/lib/pusher-client"
import type { PublicTable } from "../poker/room"
import type { PokerAction } from "../poker/engine"

const CHANNEL = "gamebook-yellow_poker"
const POLL_MS = 4000

async function post(body: Record<string, unknown>): Promise<{ view?: PublicTable; refund?: number; error?: string } & Partial<PublicTable>> {
    try {
        const res = await fetch("/api/gamebook/yellow/poker", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        return await res.json()
    } catch { return { error: "network" } }
}

export interface PokerControls {
    table: PublicTable | null
    busy: boolean
    join: (buyin: number) => Promise<boolean>
    act: (move: PokerAction) => Promise<void>
    sit: (out: boolean) => Promise<void>
    rebuy: (amount: number) => Promise<void>
    nextHand: () => Promise<void>
    /** Renvoie le tapis à recréditer en reps CÔTÉ CLIENT. */
    leave: () => Promise<number>
    refresh: () => Promise<void>
}

export function useCasinoPoker(active: boolean, myUserId: string): PokerControls {
    const [table, setTable] = useState<PublicTable | null>(null)
    const [busy, setBusy] = useState(false)
    const seatedRef = useRef(false)

    const refresh = useCallback(async () => {
        try {
            const res = await fetch("/api/gamebook/yellow/poker")
            if (res.ok) { const v = (await res.json()) as PublicTable; setTable(v); seatedRef.current = v.seats.some((s) => s.id === myUserId) }
        } catch { /* silencieux */ }
    }, [myUserId])

    useEffect(() => {
        if (!active) return
        void refresh()
        const poll = window.setInterval(() => void refresh(), POLL_MS)
        let channel: ReturnType<NonNullable<ReturnType<typeof getPusherClient>>["subscribe"]> | null = null
        if (PUSHER_CLIENT_ENABLED) {
            const client = getPusherClient()
            if (client) { channel = client.subscribe(CHANNEL); channel.bind("update", refresh) }
        }
        return () => {
            window.clearInterval(poll)
            if (channel) { channel.unbind("update", refresh); getPusherClient()?.unsubscribe(CHANNEL) }
        }
    }, [active, refresh])

    const run = useCallback(async (body: Record<string, unknown>) => {
        setBusy(true)
        try {
            const res = await post(body)
            if (res && !res.error && Array.isArray((res as PublicTable).seats)) { setTable(res as PublicTable); seatedRef.current = (res as PublicTable).seats.some((s) => s.id === myUserId) }
            return res
        } finally { setBusy(false) }
    }, [myUserId])

    return {
        table, busy,
        join: async (buyin) => { const before = seatedRef.current; await run({ action: "join", buyin }); return seatedRef.current && !before },
        act: async (move) => { await run({ action: "act", move }) },
        sit: async (out) => { await run({ action: "sit", out }) },
        rebuy: async (amount) => { await run({ action: "rebuy", amount }) },
        nextHand: async () => { await run({ action: "next" }) },
        leave: async () => {
            setBusy(true)
            try { const res = await post({ action: "leave" }); if (res?.view) { setTable(res.view); seatedRef.current = false }; return res?.refund ?? 0 } finally { setBusy(false) }
        },
        refresh,
    }
}
