"use client"

// Nexus Jaune Éclair — CHAT léger du casino (RECO 8).
// Émet/écoute `chat:say` sur le canal `gamebook-yellow_casino`. Messages
// éphémères (journal des N derniers, TTL). Identité (nickname) injectée serveur
// → anti-usurpation. Throttlé côté serveur (anti-flood).

import { useEffect, useRef, useState, useCallback } from "react"
import { getPusherClient, PUSHER_CLIENT_ENABLED } from "@/lib/pusher-client"

const CHANNEL = "yellow_casino"
const MAX_LEN = 80
const MAX_LINES = 8

export interface ChatLine { id: number; userId: string; nickname: string; text: string; mine: boolean }
export interface ChatBubble { text: string; ts: number } // #9 : bulle éphémère au-dessus de l'auteur
interface ChatMsg { type: string; userId?: string; nickname?: string; data?: { text?: string } }
const BUBBLE_MS = 4000

function post(text: string) {
    try {
        void fetch("/api/gamebook/yellow/broadcast", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channel: CHANNEL, type: "chat:say", data: { text } }),
        })
    } catch { /* best-effort */ }
}

export function useCasinoChat(opts: { active: boolean; myUserId: string; myNickname?: string; onIncoming?: (line: ChatLine) => void }) {
    const { active, myUserId, myNickname, onIncoming } = opts
    const [lines, setLines] = useState<ChatLine[]>([])
    const [bubbles, setBubbles] = useState<Record<string, ChatBubble>>({}) // #9 : par userId
    const idRef = useRef(0)
    const bubbleTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
    const onIncomingRef = useRef(onIncoming); onIncomingRef.current = onIncoming

    const push = useCallback((userId: string, nickname: string, text: string, mine: boolean) => {
        const clean = text.trim().slice(0, MAX_LEN)
        if (!clean) return
        idRef.current += 1
        const line: ChatLine = { id: idRef.current, userId, nickname, text: clean, mine }
        setLines((prev) => [...prev, line].slice(-MAX_LINES))
        // #9 — bulle éphémère au-dessus de l'auteur (local OU distant), ~4 s.
        setBubbles((prev) => ({ ...prev, [userId]: { text: clean, ts: idRef.current } }))
        const tm = bubbleTimers.current
        if (tm[userId]) clearTimeout(tm[userId])
        tm[userId] = setTimeout(() => setBubbles((prev) => { const n = { ...prev }; delete n[userId]; return n }), BUBBLE_MS)
        // #2 — notifie l'UI d'un message REÇU (toast + badge non-lus quand le chat est fermé).
        if (!mine) onIncomingRef.current?.(line)
    }, [])

    // Nettoyage des timers de bulles au démontage.
    useEffect(() => () => { Object.values(bubbleTimers.current).forEach(clearTimeout) }, [])

    const send = useCallback((raw: string) => {
        const clean = raw.trim().slice(0, MAX_LEN)
        if (!clean) return
        post(clean)
        push(myUserId, myNickname || "moi", clean, true) // écho local immédiat
    }, [myUserId, myNickname, push])

    useEffect(() => {
        if (!active || !PUSHER_CLIENT_ENABLED || !myUserId) return
        const client = getPusherClient()
        if (!client) return
        const channel = client.subscribe(`gamebook-${CHANNEL}`)
        const onSay = (d: ChatMsg) => {
            if (!d.userId || d.userId === myUserId) return // mon écho est déjà posé
            push(d.userId, d.nickname ?? "?", String(d.data?.text ?? ""), false)
        }
        channel.bind("chat:say", onSay)
        return () => { channel.unbind("chat:say", onSay) }
    }, [active, myUserId, push])

    return { lines, send, bubbles }
}
