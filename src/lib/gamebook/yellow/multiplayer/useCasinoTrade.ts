"use client"

// Nexus Jaune Éclair — ÉCHANGE 1:1 dans le casino (RECO 4).
//
// Machine à états calquée sur useCasinoChallenge :
//   trade:offer   → A propose un Daemon à B
//   trade:respond → B accepte en proposant SON Daemon (ou refuse)
//   trade:confirm → l'un des deux confirme (il faut les DEUX confirmations)
//   trade:cancel  → annulation
// Quand les deux ont confirmé → onComplete(donné, reçu) exécute le swap des DEUX
// côtés (chacun retire son Daemon offert et ajoute celui reçu).
//
// Identité injectée serveur (anti-usurpation). Un seul échange à la fois ; occupé
// (en combat / déjà en échange) → refuse les offres entrantes. Timeout de sécurité.

import { useEffect, useRef, useState, useCallback } from "react"
import { getPusherClient, PUSHER_CLIENT_ENABLED } from "@/lib/pusher-client"
import type { MonInstance } from "@/lib/gamebook/yellow/battle/types"
import { mpLog } from "./mp"

const CHANNEL = "yellow_casino"
const TRADE_TIMEOUT_MS = 90000

export interface TradeSession {
    tradeId: string
    partnerUserId: string
    partnerNickname: string
    myMon: MonInstance | null    // ce que J'offre
    theirMon: MonInstance | null // ce qu'IL offre
    myConfirmed: boolean
    theirConfirmed: boolean
    role: "A" | "B"              // A = initiateur, B = répondeur
}

interface TradeMsg {
    type: string
    userId?: string
    nickname?: string
    targetUserId?: string
    battleId?: string // réutilisé comme tradeId
    accepted?: boolean
    data?: { mon?: MonInstance }
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

export function useCasinoTrade(opts: {
    active: boolean
    myUserId: string
    busy: boolean
    onComplete: (give: MonInstance, receive: MonInstance) => void
    onClosed?: (reason: string) => void // #13 : feedback (refus / expiration / départ)
}) {
    const { active, myUserId, busy, onComplete, onClosed } = opts
    const [session, setSession] = useState<TradeSession | null>(null)
    const sessionRef = useRef<TradeSession | null>(null); sessionRef.current = session
    const busyRef = useRef(busy); busyRef.current = busy
    const onCompleteRef = useRef(onComplete); onCompleteRef.current = onComplete
    const onClosedRef = useRef(onClosed); onClosedRef.current = onClosed

    // Si les deux ont confirmé ET les deux Daemons sont posés → swap + clôture.
    const settle = useCallback((s: TradeSession): TradeSession | null => {
        if (s.myConfirmed && s.theirConfirmed && s.myMon && s.theirMon) {
            mpLog("trade", "double confirm → swap")
            onCompleteRef.current(s.myMon, s.theirMon)
            return null
        }
        return s
    }, [])

    // A initie : offre `mon` à toUser.
    const startOffer = useCallback((toUserId: string, toNickname: string, mon: MonInstance) => {
        if (sessionRef.current || busyRef.current) return
        const tradeId = `${myUserId}_${toUserId}_${Date.now()}`
        setSession({ tradeId, partnerUserId: toUserId, partnerNickname: toNickname, myMon: mon, theirMon: null, myConfirmed: false, theirConfirmed: false, role: "A" })
        post({ type: "trade:offer", targetUserId: toUserId, battleId: tradeId, data: { mon } })
    }, [myUserId])

    // B répond à l'offre entrante en proposant `mon` (null = refuse).
    const acceptWith = useCallback((mon: MonInstance | null) => {
        setSession((s) => {
            if (!s || s.role !== "B" || s.myMon) return s
            if (!mon) {
                post({ type: "trade:respond", targetUserId: s.partnerUserId, battleId: s.tradeId, accepted: false })
                return null
            }
            post({ type: "trade:respond", targetUserId: s.partnerUserId, battleId: s.tradeId, accepted: true, data: { mon } })
            return { ...s, myMon: mon }
        })
    }, [])

    const confirm = useCallback(() => {
        setSession((s) => {
            if (!s || !s.myMon || !s.theirMon || s.myConfirmed) return s
            post({ type: "trade:confirm", targetUserId: s.partnerUserId, battleId: s.tradeId })
            return settle({ ...s, myConfirmed: true })
        })
    }, [settle])

    const cancel = useCallback(() => {
        const s = sessionRef.current
        if (!s) return
        post({ type: "trade:cancel", targetUserId: s.partnerUserId, battleId: s.tradeId })
        setSession(null)
    }, [])

    useEffect(() => {
        if (!active || !PUSHER_CLIENT_ENABLED || !myUserId) return
        const client = getPusherClient()
        if (!client) return
        const channel = client.subscribe(`gamebook-${CHANNEL}`)

        const onOffer = (d: TradeMsg) => {
            if (!d.userId || d.userId === myUserId || d.targetUserId !== myUserId || !d.battleId || !d.data?.mon) return
            if (busyRef.current || sessionRef.current) {
                post({ type: "trade:respond", targetUserId: d.userId, battleId: d.battleId, accepted: false })
                return
            }
            mpLog("trade↙", "offre reçue de", d.nickname)
            setSession({ tradeId: d.battleId, partnerUserId: d.userId, partnerNickname: d.nickname ?? "?", myMon: null, theirMon: d.data.mon, myConfirmed: false, theirConfirmed: false, role: "B" })
        }
        const onRespond = (d: TradeMsg) => {
            if (d.targetUserId !== myUserId) return
            setSession((s) => {
                if (!s || s.tradeId !== d.battleId) return s
                if (!d.accepted || !d.data?.mon) { onClosedRef.current?.("L'échange a été refusé."); return null }
                return { ...s, theirMon: d.data.mon }
            })
        }
        const onConfirm = (d: TradeMsg) => {
            if (d.targetUserId !== myUserId) return
            setSession((s) => (s && s.tradeId === d.battleId ? settle({ ...s, theirConfirmed: true }) : s))
        }
        const onCancel = (d: TradeMsg) => {
            if (d.targetUserId !== myUserId) return
            setSession((s) => { if (s && s.tradeId === d.battleId) { onClosedRef.current?.("L'échange a été annulé."); return null } return s })
        }
        // #6 — si le partenaire quitte le casino/onglet pendant l'échange, on ferme le
        // modal au lieu de rester bloqué 90 s (le serveur diffuse player:disconnect).
        const onPartnerLeft = (d: TradeMsg) => {
            const s = sessionRef.current
            if (s && d.userId && d.userId === s.partnerUserId) {
                setSession(null)
                onClosedRef.current?.("Le dresseur a quitté l'échange.")
            }
        }

        channel.bind("trade:offer", onOffer)
        channel.bind("trade:respond", onRespond)
        channel.bind("trade:confirm", onConfirm)
        channel.bind("trade:cancel", onCancel)
        channel.bind("player:disconnect", onPartnerLeft)
        return () => {
            channel.unbind("trade:offer", onOffer)
            channel.unbind("trade:respond", onRespond)
            channel.unbind("trade:confirm", onConfirm)
            channel.unbind("trade:cancel", onCancel)
            channel.unbind("player:disconnect", onPartnerLeft)
            // #6 — je pars avec un échange en cours → préviens le partenaire (sinon il
            // reste coincé sur un modal non fermable jusqu'au timeout).
            const s = sessionRef.current
            if (s) post({ type: "trade:cancel", targetUserId: s.partnerUserId, battleId: s.tradeId })
            setSession(null)
        }
    }, [active, myUserId, settle])

    // Timeout de sécurité (offre sans suite) — #13 : avec feedback explicite.
    useEffect(() => {
        if (!session) return
        const t = setTimeout(() => {
            setSession(null)
            onClosedRef.current?.("Échange expiré (aucune réponse).")
        }, TRADE_TIMEOUT_MS)
        return () => clearTimeout(t)
    }, [session])

    return { session, startOffer, acceptWith, confirm, cancel }
}
