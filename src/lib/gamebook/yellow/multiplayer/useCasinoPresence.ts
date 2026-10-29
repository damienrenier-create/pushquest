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
// zone (casino / salle de fusion / lieu social, cf. presenceMaps) DOIT avoir son propre canal
// (sinon les positions d'une carte s'affichent sur une autre). D'où la prop `channel`.
//
// QUOTA (29/10/2026) : chaque copie livrée compte dans les 200 000 messages/jour du plan gratuit Pusher.
//   - l'émetteur ne reçoit plus sa propre copie (socketId transmis au relai) ;
//   - TOUS mes player:move (pas, réponse aux hello, heartbeat, retour d'onglet) passent par un seul envoyeur regroupé :
//     au plus un message toutes les 150 ms (le relai refuse en deçà de 120 ms), la DERNIÈRE position part toujours
//     (envoi différé, et un refus 429 réarme l'envoi), sinon les autres nous voyaient arrêtés quelques cases en arrière ;
//   - un onglet CACHÉ se retire (player:away, PAS player:disconnect : un échange ou un défi en cours au casino ne doit
//     pas se fermer chez l'autre seulement), ne bat plus de heartbeat et ne répond plus aux hello ; à l'affichage il
//     reposte sa position (un move, pas un hello qui ferait répondre tout le canal) ;
//   - un canal de LIEU SOCIAL (yellow_p_*) est quitté en changeant de carte ;
//   - `countOnly` (canal global des comptes fun, qui ne sert qu'à COMPTER les joueurs en ligne) : pas de
//     message à chaque pas, le heartbeat suffit.
//
// Réutilise l'infra Pusher existante (canal public + relai serveur). Aucune
// persistance : la présence est 100% éphémère (rien en base Neon).

import { useEffect, useRef, useState, useCallback } from "react"
import { getPusherClient, PUSHER_CLIENT_ENABLED } from "@/lib/pusher-client"
import { isMapPresenceChannel } from "./presenceMaps"

export interface RemotePlayer {
    userId: string
    nickname: string
    posX: number
    posY: number
    direction: string
    /** FASHION VICTIM — avatar Gen3 choisi, diffusé en présence (les autres te voient avec). Optionnel/rétro-compat. */
    avatar?: string
    ts: number
}

const STALE_MS = 20000   // joueur muet > 20s → retiré
const SWEEP_MS = 5000
const MOVE_GAP_MS = 150  // regroupement des pas (relai : 1 message / 120 ms / joueur / canal ; 30 ms de marge pour la gigue réseau)

interface MovePayload {
    type: string
    userId?: string
    nickname?: string
    posX?: number
    posY?: number
    direction?: string
    avatar?: string
}

export function useCasinoPresence(opts: {
    active: boolean
    myUserId: string
    posX: number
    posY: number
    direction: string
    /** Canal de présence. Défaut `yellow_casino` (casino) ; `yellow_autel` pour la salle de fusion. */
    channel?: string
    /** FASHION VICTIM — avatar Gen3 choisi du joueur local, diffusé aux autres. */
    avatar?: string
    /** Canal qui ne sert qu'à COMPTER les joueurs (présence globale fun) : pas de message à chaque pas. */
    countOnly?: boolean
}): RemotePlayer[] {
    const { active, myUserId, posX, posY, direction, channel = "yellow_casino", avatar, countOnly = false } = opts
    const [players, setPlayers] = useState<Record<string, RemotePlayer>>({})

    // Position (+ avatar) courante accessible dans les callbacks (pour répondre à un "hello" / heartbeat).
    const posRef = useRef({ posX, posY, direction, avatar })
    posRef.current = { posX, posY, direction, avatar }

    /** Poste un message de présence (best-effort, jamais bloquant) sur le canal courant. */
    const post = useCallback((body: Record<string, unknown>, keepalive = false): Promise<Response> | null => {
        try {
            // socketId : le relai n'envoie pas la copie à MON onglet (je l'ignorais de toute façon).
            const socketId = getPusherClient()?.connection?.socket_id
            const req = fetch("/api/gamebook/yellow/broadcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channel, ...body, ...(socketId ? { socketId } : {}) }),
                keepalive,
            })
            req.catch(() => { /* silencieux : si le relai échoue, les autres verront au prochain move */ })
            return req
        } catch {
            return null
        }
    }, [channel])

    // ENVOYEUR REGROUPÉ de ma position. Le timer différé lit posRef AU DÉPART (dernière position). genRef invalide les
    //   envois prévus ou en vol d'une carte quittée (sinon un vieux pas repartait sur l'ancien canal). Rien ne part d'un
    //   onglet caché.
    const lastSentRef = useRef(0)
    const trailRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const genRef = useRef(0)
    const announcedRef = useRef(false)
    const sendMove = useCallback(() => {
        if (document.hidden || trailRef.current) return // un envoi est déjà prévu : il portera la dernière position
        const gen = genRef.current
        const fire = () => {
            trailRef.current = null
            if (gen !== genRef.current || document.hidden) return
            lastSentRef.current = Date.now()
            post({ type: "player:move", ...posRef.current })?.then((r) => {
                if (r.status === 429 && gen === genRef.current && !trailRef.current) trailRef.current = setTimeout(fire, MOVE_GAP_MS)
            }).catch(() => { /* réseau : le heartbeat reprendra */ })
        }
        const wait = MOVE_GAP_MS - (Date.now() - lastSentRef.current)
        if (wait <= 0) fire()
        else trailRef.current = setTimeout(fire, wait)
    }, [post])
    const stopMoves = useCallback(() => {
        genRef.current++
        if (trailRef.current) { clearTimeout(trailRef.current); trailRef.current = null }
    }, [])

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
                avatar: p.avatar,
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
            if (document.hidden) return // onglet caché : je me suis retiré, je ne réapparais pas pour l'arrivant
            // Quelqu'un arrive : je lui renvoie ma position (+ avatar) pour qu'il me voie.
            sendMove()
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
        chan.bind("player:away", onDisconnect)

        // J'annonce mon arrivée + ma position de départ (onglet caché : je m'annoncerai à l'affichage).
        announcedRef.current = !document.hidden
        if (announcedRef.current) {
            post({ type: "player:hello", ...posRef.current })
            sendMove()
        }

        return () => {
            stopMoves()
            post({ type: "player:disconnect" }, true)
            chan.unbind("player:move", onMove)
            chan.unbind("player:hello", onHello)
            chan.unbind("player:disconnect", onDisconnect)
            chan.unbind("player:away", onDisconnect)
            // ⚠️ #4 — on NE désabonne PAS le canal `yellow_casino` : il est PARTAGÉ avec
            // chat / défi / échange. Un unsubscribe global ici coupait leur réception
            // selon l'ordre de cleanup React. On retire seulement nos handlers.
            // (Le canal `yellow_autel` n'est utilisé que par présence+défi fusion → même prudence.)
            // Un canal de LIEU SOCIAL n'est lu QUE par ce hook : on le quitte (sinon l'onglet continuerait de recevoir,
            //   et de faire compter, tous les pas de la Ville Jaune après en être sorti).
            if (isMapPresenceChannel(channel)) client.unsubscribe(channelName)
            setPlayers({})
        }
    }, [active, myUserId, upsert, channel, post, sendMove, stopMoves])

    // === Diffusion de MA position à chaque changement de tuile/direction (regroupée, la dernière part toujours) ===
    useEffect(() => {
        if (!active || countOnly) return
        sendMove()
    }, [active, countOnly, posX, posY, direction, avatar, sendMove])
    useEffect(() => () => stopMoves(), [active, channel, stopMoves])

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
            if (document.hidden) return // onglet caché : il s'est retiré, il ne coûte plus rien
            sendMove()
        }, 10000)
        const onUnload = () => post({ type: "player:disconnect" }, true)
        // Onglet caché (autre onglet, écran verrouillé) → je me retire de la présence (et j'annule un pas prévu) ; de
        //   retour → je reposte ma position, ou je m'annonce (hello) si l'onglet a pris la carte en étant caché.
        const onVisibility = () => {
            if (document.hidden) { stopMoves(); post({ type: "player:away" }, true); return }
            if (!announcedRef.current) { announcedRef.current = true; post({ type: "player:hello", ...posRef.current }) }
            sendMove()
        }
        window.addEventListener("beforeunload", onUnload)
        document.addEventListener("visibilitychange", onVisibility)
        return () => {
            clearInterval(sweep)
            clearInterval(heartbeat)
            window.removeEventListener("beforeunload", onUnload)
            document.removeEventListener("visibilitychange", onVisibility)
        }
    }, [active, post, sendMove, stopMoves])

    return Object.values(players)
}
