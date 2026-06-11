"use client"

// Nexus Jaune Éclair — ÉCHANGE de CT (Capsules Techniques) dans le casino.
// Flux SÉPARÉ de l'échange de Daemons (calqué dessus mais sur des id de CT), avec ses
// propres events cttrade:* pour ne pas interférer :
//   cttrade:offer   → A propose une CT à B
//   cttrade:respond → B accepte en proposant SA CT (ou refuse)
//   cttrade:confirm → confirmation (les DEUX doivent confirmer)
//   cttrade:cancel  → annulation
// Quand les deux ont confirmé → onComplete(donnée, reçue) fait le swap des 2 côtés.

import { useEffect, useRef, useState, useCallback } from "react"
import { getPusherClient, PUSHER_CLIENT_ENABLED } from "@/lib/pusher-client"
import { mpLog } from "./mp"

const CHANNEL = "yellow_casino"
const TRADE_TIMEOUT_MS = 90000

export interface CtTradeSession {
    tradeId: string
    partnerUserId: string
    partnerNickname: string
    myCt: string | null    // id de CT que J'offre
    theirCt: string | null // id de CT qu'IL offre
    myConfirmed: boolean
    theirConfirmed: boolean
    role: "A" | "B"
}

interface CtMsg {
    type: string
    userId?: string
    nickname?: string
    targetUserId?: string
    battleId?: string // réutilisé comme tradeId
    accepted?: boolean
    data?: { ctId?: string }
}

function post(body: Record<string, unknown>) {
    try {
        void fetch("/api/gamebook/yellow/broadcast", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channel: CHANNEL, ...body }),
        })
    } catch { /* best-effort */ }
}

export function useCasinoCtTrade(opts: {
    active: boolean
    myUserId: string
    busy: boolean
    onComplete: (giveCtId: string, receiveCtId: string) => void
    onClosed?: (reason: string) => void
}) {
    const { active, myUserId, busy, onComplete, onClosed } = opts
    const [session, setSession] = useState<CtTradeSession | null>(null)
    const sessionRef = useRef<CtTradeSession | null>(null); sessionRef.current = session
    const busyRef = useRef(busy); busyRef.current = busy
    const onCompleteRef = useRef(onComplete); onCompleteRef.current = onComplete
    const onClosedRef = useRef(onClosed); onClosedRef.current = onClosed

    const settle = useCallback((s: CtTradeSession): CtTradeSession | null => {
        if (s.myConfirmed && s.theirConfirmed && s.myCt && s.theirCt) {
            mpLog("cttrade", "double confirm → swap")
            onCompleteRef.current(s.myCt, s.theirCt)
            return null
        }
        return s
    }, [])

    const startOffer = useCallback((toUserId: string, toNickname: string, ctId: string) => {
        if (sessionRef.current || busyRef.current) return
        const tradeId = `ct${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`
        setSession({ tradeId, partnerUserId: toUserId, partnerNickname: toNickname, myCt: ctId, theirCt: null, myConfirmed: false, theirConfirmed: false, role: "A" })
        post({ type: "cttrade:offer", targetUserId: toUserId, battleId: tradeId, data: { ctId } })
    }, [])

    const acceptWith = useCallback((ctId: string | null) => {
        setSession((s) => {
            if (!s || s.role !== "B" || s.myCt) return s
            if (!ctId) {
                post({ type: "cttrade:respond", targetUserId: s.partnerUserId, battleId: s.tradeId, accepted: false })
                return null
            }
            post({ type: "cttrade:respond", targetUserId: s.partnerUserId, battleId: s.tradeId, accepted: true, data: { ctId } })
            return { ...s, myCt: ctId }
        })
    }, [])

    const confirm = useCallback(() => {
        setSession((s) => {
            if (!s || !s.myCt || !s.theirCt || s.myConfirmed) return s
            post({ type: "cttrade:confirm", targetUserId: s.partnerUserId, battleId: s.tradeId })
            return settle({ ...s, myConfirmed: true })
        })
    }, [settle])

    const cancel = useCallback(() => {
        const s = sessionRef.current
        if (!s) return
        post({ type: "cttrade:cancel", targetUserId: s.partnerUserId, battleId: s.tradeId })
        setSession(null)
    }, [])

    useEffect(() => {
        if (!active || !PUSHER_CLIENT_ENABLED || !myUserId) return
        const client = getPusherClient()
        if (!client) return
        const channel = client.subscribe(`gamebook-${CHANNEL}`)

        const onOffer = (d: CtMsg) => {
            if (!d.userId || d.userId === myUserId || d.targetUserId !== myUserId || !d.battleId || !d.data?.ctId) return
            if (busyRef.current || sessionRef.current) {
                post({ type: "cttrade:respond", targetUserId: d.userId, battleId: d.battleId, accepted: false })
                return
            }
            mpLog("cttrade↙", "offre CT reçue de", d.nickname)
            setSession({ tradeId: d.battleId, partnerUserId: d.userId, partnerNickname: d.nickname ?? "?", myCt: null, theirCt: d.data.ctId, myConfirmed: false, theirConfirmed: false, role: "B" })
        }
        const onRespond = (d: CtMsg) => {
            if (d.targetUserId !== myUserId) return
            setSession((s) => {
                if (!s || s.tradeId !== d.battleId) return s
                if (!d.accepted || !d.data?.ctId) { onClosedRef.current?.("L'échange de CT a été refusé."); return null }
                return { ...s, theirCt: d.data.ctId }
            })
        }
        const onConfirm = (d: CtMsg) => {
            if (d.targetUserId !== myUserId) return
            setSession((s) => (s && s.tradeId === d.battleId ? settle({ ...s, theirConfirmed: true }) : s))
        }
        const onCancel = (d: CtMsg) => {
            if (d.targetUserId !== myUserId) return
            setSession((s) => { if (s && s.tradeId === d.battleId) { onClosedRef.current?.("L'échange de CT a été annulé."); return null } return s })
        }
        const onPartnerLeft = (d: CtMsg) => {
            const s = sessionRef.current
            if (s && d.userId && d.userId === s.partnerUserId) {
                setSession(null)
                onClosedRef.current?.("Le dresseur a quitté l'échange.")
            }
        }

        channel.bind("cttrade:offer", onOffer)
        channel.bind("cttrade:respond", onRespond)
        channel.bind("cttrade:confirm", onConfirm)
        channel.bind("cttrade:cancel", onCancel)
        channel.bind("player:disconnect", onPartnerLeft)
        return () => {
            channel.unbind("cttrade:offer", onOffer)
            channel.unbind("cttrade:respond", onRespond)
            channel.unbind("cttrade:confirm", onConfirm)
            channel.unbind("cttrade:cancel", onCancel)
            channel.unbind("player:disconnect", onPartnerLeft)
            const s = sessionRef.current
            if (s) post({ type: "cttrade:cancel", targetUserId: s.partnerUserId, battleId: s.tradeId })
            setSession(null)
        }
    }, [active, myUserId, settle])

    useEffect(() => {
        if (!session) return
        const t = setTimeout(() => {
            setSession(null)
            onClosedRef.current?.("Échange de CT expiré (aucune réponse).")
        }, TRADE_TIMEOUT_MS)
        return () => clearTimeout(t)
    }, [session])

    return { session, startOffer, acceptWith, confirm, cancel }
}
