"use client"

// Nexus Jaune Éclair — DÉFIS multijoueur (Phase 2).
//
// Écoute, sur le canal de présence (`gamebook-<channel>`, défaut `yellow_casino`),
// les évènements de défi :
//   challenge:send     → quelqu'un me défie
//   challenge:respond  → réponse (accepté/refusé) à MON défi
//   challenge:cancel   → annulation
// Machine à états simple : un seul défi sortant ET un seul entrant à la fois.
// À l'acceptation (des deux côtés), onStart() est appelé pour lancer le combat.
//
// ⚠️ Le canal PILOTE la nature du combat : `yellow_casino` = PvP normal, `yellow_autel`
//   = PvP de FUSION (l'appelant décide quoi construire à partir de la session renvoyée).
//
// ⚠️ RISQUE : races de défis (deux défis croisés). v1 : on auto-refuse tout
//   nouveau défi entrant si on est déjà occupé (sortant en cours / en combat).

import { useEffect, useRef, useState, useCallback } from "react"
import { getPusherClient, PUSHER_CLIENT_ENABLED } from "@/lib/pusher-client"
import type { PvpRole } from "@/lib/gamebook/yellow/store/battleStore"
import { mpLog } from "./mp"

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

export function useCasinoChallenge(opts: {
    active: boolean
    myUserId: string
    busy: boolean // déjà en combat → refuser les défis entrants
    onStart: (s: BattleStart) => void
    /** Canal de défi. Défaut `yellow_casino` (PvP normal) ; `yellow_autel` pour le PvP de fusion. */
    channel?: string
}) {
    const { active, myUserId, busy, onStart, channel = "yellow_casino" } = opts
    const [incoming, setIncoming] = useState<IncomingChallenge | null>(null)
    const [outgoing, setOutgoing] = useState<OutgoingChallenge | null>(null)

    // Réfs "latest" pour les callbacks du canal (évite des re-bind à chaque état).
    const outgoingRef = useRef<OutgoingChallenge | null>(null); outgoingRef.current = outgoing
    const busyRef = useRef(busy); busyRef.current = busy
    const onStartRef = useRef(onStart); onStartRef.current = onStart

    const post = useCallback((body: Record<string, unknown>) => {
        try {
            void fetch("/api/gamebook/yellow/broadcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channel, ...body }),
            })
        } catch { /* best-effort */ }
    }, [channel])

    // Envoi d'un défi à un joueur (par son userId).
    const sendChallenge = useCallback((toUserId: string, toNickname: string) => {
        if (outgoingRef.current || busyRef.current) return
        // battleId COURT (unique, connu des deux camps) : horodatage + aléa, en base36.
        // ⚠️ NE PAS mettre les userId (2 cuid de 25 chars) → le canal `yellow_battle_<id>`
        // dépassait 64 chars et était REJETÉ (400) par le broadcast → combat jamais démarré.
        const battleId = `b${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`
        setOutgoing({ toUserId, toNickname, battleId })
        post({ type: "challenge:send", targetUserId: toUserId, battleId })
    }, [post])

    const cancelChallenge = useCallback(() => {
        const o = outgoingRef.current
        if (!o) return
        post({ type: "challenge:cancel", targetUserId: o.toUserId, battleId: o.battleId })
        setOutgoing(null)
    }, [post])

    const respond = useCallback((accepted: boolean) => {
        setIncoming((cur) => {
            if (!cur) return null
            post({ type: "challenge:respond", targetUserId: cur.fromUserId, battleId: cur.battleId, accepted })
            if (accepted) {
                onStartRef.current({ battleId: cur.battleId, oppUserId: cur.fromUserId, oppNickname: cur.fromNickname, role: "B" })
            }
            return null
        })
    }, [post])

    // Abonnement aux évènements de défi (le canal est partagé avec la présence ;
    // on NE désabonne PAS ici, on retire juste nos handlers).
    useEffect(() => {
        if (!active || !PUSHER_CLIENT_ENABLED || !myUserId) return
        const client = getPusherClient()
        if (!client) return
        const chan = client.subscribe(`gamebook-${channel}`)

        const onSend = (d: ChallengeMsg) => {
            if (!d.userId || d.userId === myUserId || d.targetUserId !== myUserId || !d.battleId) return
            const o = outgoingRef.current
            // #4 — défi MUTUEL (on se défie en même temps) → tie-break DÉTERMINISTE :
            // le plus PETIT userId est l'hôte (A). Évite la création de 2 combats.
            if (o && o.toUserId === d.userId) {
                if (myUserId < d.userId) {
                    mpLog("challenge", "mutuel : je garde mon défi (userId plus petit)")
                    return // mon défi sortant l'emporte ; l'autre acceptera le mien
                }
                mpLog("challenge", "mutuel : j'annule le mien, je traite le sien")
                post({ type: "challenge:cancel", targetUserId: o.toUserId, battleId: o.battleId })
                setOutgoing(null)
                setIncoming({ fromUserId: d.userId, fromNickname: d.nickname ?? "?", battleId: d.battleId })
                return
            }
            if (busyRef.current || outgoingRef.current) {
                post({ type: "challenge:respond", targetUserId: d.userId, battleId: d.battleId, accepted: false })
                return
            }
            mpLog("challenge↙", "défi reçu de", d.nickname)
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

        chan.bind("challenge:send", onSend)
        chan.bind("challenge:respond", onRespond)
        chan.bind("challenge:cancel", onCancel)
        return () => {
            chan.unbind("challenge:send", onSend)
            chan.unbind("challenge:respond", onRespond)
            chan.unbind("challenge:cancel", onCancel)
            setIncoming(null)
            setOutgoing(null)
        }
    }, [active, myUserId, channel, post])

    // Timeout du défi sortant (sans réponse).
    useEffect(() => {
        if (!outgoing) return
        const t = setTimeout(() => setOutgoing(null), CHALLENGE_TIMEOUT_MS)
        return () => clearTimeout(t)
    }, [outgoing])

    return { incoming, outgoing, sendChallenge, cancelChallenge, respond }
}
