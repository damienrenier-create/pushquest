"use client"

// Nexus Jaune Éclair — PRÉSENCE TEMPS RÉEL (Phase 1 multijoueur).
//
// Quand le joueur est dans une zone multijoueur (casino, ou salle de fusion), ce hook :
//   - s'abonne au canal Pusher public `gamebook-<channel>` (défaut `yellow_casino`)
//   - diffuse sa position à chaque changement de TUILE (throttlé serveur)
//   - écoute les autres joueurs (move/hello/disconnect) et tient à jour leur liste
//   - répond à un "hello" par sa propre position (le nouvel arrivant voit tout le monde)
//   - purge les joueurs muets depuis trop longtemps (filet anti-fantôme)
//   - signale son départ (disconnect) à la sortie / fermeture d'onglet
//
// ⚠️ La présence est per-CANAL : les coordonnées sont propres à une carte, donc chaque
// zone (casino / salle de fusion) DOIT avoir son propre canal (sinon les positions d'une
// carte s'affichent sur une autre). D'où la prop `channel`.
//
// Réutilise l'infra Pusher existante (canal public + relai serveur). Aucune
// persistance : la présence est 100% éphémère (rien en base Neon).

import { useEffect, useRef, useState, useCallback } from "react"
import { getPusherClient, PUSHER_CLIENT_ENABLED } from "@/lib/pusher-client"

export interface RemotePlayer {
    userId: string
    nickname: string
    posX: number
    posY: number
    direction: string
    ts: number
}

const STALE_MS = 20000   // joueur muet > 20s → retiré
const SWEEP_MS = 5000

interface MovePayload {
    type: string
    userId?: string
    nickname?: string
    posX?: number
    posY?: number
    direction?: string
}

export function useCasinoPresence(opts: {
    active: boolean
    myUserId: string
    posX: number
    posY: number
    direction: string
    /** Canal de présence. Défaut `yellow_casino` (casino) ; `yellow_autel` pour la salle de fusion. */
    channel?: string
}): RemotePlayer[] {
    const { active, myUserId, posX, posY, direction, channel = "yellow_casino" } = opts
    const [players, setPlayers] = useState<Record<string, RemotePlayer>>({})

    // Position courante accessible dans les callbacks (pour répondre à un "hello").
    const posRef = useRef({ posX, posY, direction })
    posRef.current = { posX, posY, direction }

    /** Poste un message de présence (best-effort, jamais bloquant) sur le canal courant. */
    const post = useCallback((body: Record<string, unknown>, keepalive = false) => {
        try {
            void fetch("/api/gamebook/yellow/broadcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channel, ...body }),
                keepalive,
            })
        } catch {
            /* silencieux : si le relai échoue, les autres verront au prochain move */
        }
    }, [channel])

    const upsert = useCallback((p: MovePayload) => {
        if (!p.userId || p.userId === myUserId) return
        if (typeof p.posX !== "number" || typeof p.posY !== "number") return
        setPlayers((prev) => ({
            ...prev,
            [p.userId!]: {
                userId: p.userId!,
                nickname: p.nickname ?? "?",
                posX: p.posX!,
                posY: p.posY!,
                direction: p.direction ?? "down",
                ts: Date.now(),
            },
        }))
    }, [myUserId])

    // === Abonnement au canal (monté uniquement quand on est dans la zone) ===
    useEffect(() => {
        if (!active || !PUSHER_CLIENT_ENABLED) return
        const client = getPusherClient()
        if (!client) return
        const channelName = `gamebook-${channel}`
        const chan = client.subscribe(channelName)

        const onMove = (data: MovePayload) => upsert(data)
        const onHello = (data: MovePayload) => {
            if (!data.userId || data.userId === myUserId) return
            upsert(data)
            // Quelqu'un arrive : je lui renvoie ma position pour qu'il me voie.
            const { posX, posY, direction } = posRef.current
            post({ type: "player:move", posX, posY, direction })
        }
        const onDisconnect = (data: MovePayload) => {
            if (!data.userId) return
            setPlayers((prev) => {
                if (!prev[data.userId!]) return prev
                const next = { ...prev }
                delete next[data.userId!]
                return next
            })
        }

        chan.bind("player:move", onMove)
        chan.bind("player:hello", onHello)
        chan.bind("player:disconnect", onDisconnect)

        // J'annonce mon arrivée + ma position de départ.
        post({ type: "player:hello", ...posRef.current })
        post({ type: "player:move", ...posRef.current })

        return () => {
            post({ type: "player:disconnect" }, true)
            chan.unbind("player:move", onMove)
            chan.unbind("player:hello", onHello)
            chan.unbind("player:disconnect", onDisconnect)
            // ⚠️ #4 — on NE désabonne PAS le canal `yellow_casino` : il est PARTAGÉ avec
            // chat / défi / échange. Un unsubscribe global ici coupait leur réception
            // selon l'ordre de cleanup React. On retire seulement nos handlers.
            // (Le canal `yellow_autel` n'est utilisé que par présence+défi fusion → même prudence.)
            setPlayers({})
        }
    }, [active, myUserId, upsert, channel, post])

    // === Diffusion de MA position à chaque changement de tuile/direction ===
    useEffect(() => {
        if (!active) return
        post({ type: "player:move", posX, posY, direction })
    }, [active, posX, posY, direction, post])

    // === Purge des joueurs muets + disconnect sur fermeture d'onglet ===
    useEffect(() => {
        if (!active) return
        const sweep = setInterval(() => {
            const cutoff = Date.now() - STALE_MS
            setPlayers((prev) => {
                let changed = false
                const next: Record<string, RemotePlayer> = {}
                for (const [id, p] of Object.entries(prev)) {
                    if (p.ts >= cutoff) next[id] = p
                    else changed = true
                }
                return changed ? next : prev
            })
        }, SWEEP_MS)
        // #12 — HEARTBEAT : re-poste ma position périodiquement pour ne pas être purgé
        // (STALE 20 s) quand je reste immobile → fini le clignotement disparition/retour.
        const heartbeat = setInterval(() => {
            const { posX, posY, direction } = posRef.current
            post({ type: "player:move", posX, posY, direction })
        }, 10000)
        const onUnload = () => post({ type: "player:disconnect" }, true)
        window.addEventListener("beforeunload", onUnload)
        return () => {
            clearInterval(sweep)
            clearInterval(heartbeat)
            window.removeEventListener("beforeunload", onUnload)
        }
    }, [active, post])

    return Object.values(players)
}
