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
interface ChatMsg { type: string; userId?: string; nickname?: string; data?: { text?: string } }

function post(text: string) {
    try {
        void fetch("/api/gamebook/yellow/broadcast", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channel: CHANNEL, type: "chat:say", data: { text } }),
        })
    } catch { /* best-effort */ }
}

export function useCasinoChat(opts: { active: boolean; myUserId: string; myNickname?: string }) {
    const { active, myUserId, myNickname } = opts
    const [lines, setLines] = useState<ChatLine[]>([])
    const idRef = useRef(0)

    const push = useCallback((userId: string, nickname: string, text: string, mine: boolean) => {
        const clean = text.trim().slice(0, MAX_LEN)
        if (!clean) return
        idRef.current += 1
        const line: ChatLine = { id: idRef.current, userId, nickname, text: clean, mine }
        setLines((prev) => [...prev, line].slice(-MAX_LINES))
    }, [])

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

    return { lines, send }
}
