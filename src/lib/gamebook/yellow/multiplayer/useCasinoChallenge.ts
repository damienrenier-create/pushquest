"use client"

// Nexus Jaune Éclair — DÉFIS dans le casino (Phase 2 multijoueur).
//
// Écoute, sur le canal `gamebook-yellow_casino`, les évènements de défi :
//   challenge:send     → quelqu'un me défie
//   challenge:respond  → réponse (accepté/refusé) à MON défi
//   challenge:cancel   → annulation
// Machine à états simple : un seul défi sortant ET un seul entrant à la fois.
// À l'acceptation (des deux côtés), onStart() est appelé pour lancer le combat.
//
// ⚠️ RISQUE : races de défis (deux défis croisés). v1 : on auto-refuse tout
//   nouveau défi entrant si on est déjà occupé (sortant en cours / en combat).

import { useEffect, useRef, useState, useCallback } from "react"
import { getPusherClient, PUSHER_CLIENT_ENABLED } from "@/lib/pusher-client"
import type { PvpRole } from "@/lib/gamebook/yellow/store/battleStore"

const CHANNEL = "yellow_casino"
const CHALLENGE_TIMEOUT_MS = 20000

export interface IncomingChallenge { fromUserId: string; fromNickname: string; battleId: string }
export interface OutgoingChallenge { toUserId: string; toNickname: string; battleId: string }
export interface BattleStart {
    battleId: string
    oppUserId: string
    oppNickname: string
    role: PvpRole // A = je challenge (host), B = je suis défié
}

interface ChallengeMsg {
    type: string
    userId?: string
    nickname?: string
    targetUserId?: string
    battleId?: string
    accepted?: boolean
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

export function useCasinoChallenge(opts: {
    active: boolean
    myUserId: string
    busy: boolean // déjà en combat → refuser les défis entrants
    onStart: (s: BattleStart) => void
}) {
    const { active, myUserId, busy, onStart } = opts
    const [incoming, setIncoming] = useState<IncomingChallenge | null>(null)
    const [outgoing, setOutgoing] = useState<OutgoingChallenge | null>(null)

    // Réfs "latest" pour les callbacks du canal (évite des re-bind à chaque état).
    const outgoingRef = useRef<OutgoingChallenge | null>(null); outgoingRef.current = outgoing
    const busyRef = useRef(busy); busyRef.current = busy
    const onStartRef = useRef(onStart); onStartRef.current = onStart

    // Envoi d'un défi à un joueur (par son userId).
    const sendChallenge = useCallback((toUserId: string, toNickname: string) => {
        if (outgoingRef.current || busyRef.current) return
        // battleId : challenger + cible + horodatage (unique, connu des deux camps).
        const battleId = `${myUserId}_${toUserId}_${Date.now()}`
        setOutgoing({ toUserId, toNickname, battleId })
        post({ type: "challenge:send", targetUserId: toUserId, battleId })
    }, [myUserId])

    const cancelChallenge = useCallback(() => {
        const o = outgoingRef.current
        if (!o) return
        post({ type: "challenge:cancel", targetUserId: o.toUserId, battleId: o.battleId })
        setOutgoing(null)
    }, [])

    const respond = useCallback((accepted: boolean) => {
        setIncoming((cur) => {
            if (!cur) return null
            post({ type: "challenge:respond", targetUserId: cur.fromUserId, battleId: cur.battleId, accepted })
            if (accepted) {
                onStartRef.current({ battleId: cur.battleId, oppUserId: cur.fromUserId, oppNickname: cur.fromNickname, role: "B" })
            }
            return null
        })
    }, [])

    // Abonnement aux évènements de défi (le canal est partagé avec la présence ;
    // on NE désabonne PAS ici, on retire juste nos handlers).
    useEffect(() => {
        if (!active || !PUSHER_CLIENT_ENABLED || !myUserId) return
        const client = getPusherClient()
        if (!client) return
        const channel = client.subscribe(`gamebook-${CHANNEL}`)

        const onSend = (d: ChallengeMsg) => {
            if (!d.userId || d.userId === myUserId || d.targetUserId !== myUserId || !d.battleId) return
            if (busyRef.current || outgoingRef.current) {
                // Occupé → refus auto.
                post({ type: "challenge:respond", targetUserId: d.userId, battleId: d.battleId, accepted: false })
                return
            }
            setIncoming({ fromUserId: d.userId, fromNickname: d.nickname ?? "?", battleId: d.battleId })
        }
        const onRespond = (d: ChallengeMsg) => {
            if (d.targetUserId !== myUserId) return
            const o = outgoingRef.current
            if (!o || o.battleId !== d.battleId) return
            setOutgoing(null)
            if (d.accepted && d.userId) {
                onStartRef.current({ battleId: o.battleId, oppUserId: d.userId, oppNickname: d.nickname ?? o.toNickname, role: "A" })
            }
        }
        const onCancel = (d: ChallengeMsg) => {
            if (d.targetUserId !== myUserId) return
            setIncoming((cur) => (cur && cur.battleId === d.battleId ? null : cur))
        }

        channel.bind("challenge:send", onSend)
        channel.bind("challenge:respond", onRespond)
        channel.bind("challenge:cancel", onCancel)
        return () => {
            channel.unbind("challenge:send", onSend)
            channel.unbind("challenge:respond", onRespond)
            channel.unbind("challenge:cancel", onCancel)
            setIncoming(null)
            setOutgoing(null)
        }
    }, [active, myUserId])

    // Timeout du défi sortant (sans réponse).
    useEffect(() => {
        if (!outgoing) return
        const t = setTimeout(() => setOutgoing(null), CHALLENGE_TIMEOUT_MS)
        return () => clearTimeout(t)
    }, [outgoing])

    return { incoming, outgoing, sendChallenge, cancelChallenge, respond }
}
