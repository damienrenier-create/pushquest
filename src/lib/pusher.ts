// src/lib/pusher.ts
//
// Lib serveur Pusher pour le Gamebook multijoueur temps réel.
//
// FALLBACK GRACIEUX : si les variables d'environnement Pusher ne sont pas configurées,
// la lib est en mode "no-op" et l'app continue de fonctionner avec le polling actuel.
//
// Variables requises (à configurer dans Vercel) :
//   PUSHER_APP_ID
//   PUSHER_KEY
//   PUSHER_SECRET
//   PUSHER_CLUSTER

import Pusher from "pusher"

const APP_ID = process.env.PUSHER_APP_ID
const KEY = process.env.PUSHER_KEY
const SECRET = process.env.PUSHER_SECRET
const CLUSTER = process.env.PUSHER_CLUSTER

export const PUSHER_ENABLED = Boolean(APP_ID && KEY && SECRET && CLUSTER)

let pusherInstance: Pusher | null = null

function getPusher(): Pusher | null {
    if (!PUSHER_ENABLED) return null
    if (pusherInstance) return pusherInstance
    pusherInstance = new Pusher({
        appId: APP_ID!,
        key: KEY!,
        secret: SECRET!,
        cluster: CLUSTER!,
        useTLS: true,
    })
    return pusherInstance
}

export type PusherEventType =
    | "player:move"
    | "player:push"
    | "player:disconnect"
    | "cinematic:trigger"

export interface PusherPayload {
    type: PusherEventType
    userId: string
    nickname?: string
    mapId?: string
    posX?: number
    posY?: number
    direction?: string
    targetUserId?: string         // pour player:push
    cinematicId?: string          // pour cinematic:trigger
    [key: string]: unknown
}

/**
 * Publie un event Pusher. Ne lève PAS d'exception si Pusher n'est pas configuré
 * ou si la publication échoue (mode best-effort).
 */
export async function publishToGamebook(
    channelSuffix: string,
    payload: PusherPayload
): Promise<{ ok: boolean; published: boolean; reason?: string }> {
    const pusher = getPusher()
    if (!pusher) {
        return { ok: true, published: false, reason: "Pusher not configured" }
    }
    try {
        const channel = `gamebook-${channelSuffix}`
        await pusher.trigger(channel, payload.type, payload)
        return { ok: true, published: true }
    } catch (e) {
        console.warn("[Pusher] publish failed", e)
        return { ok: false, published: false, reason: "Publish failed" }
    }
}

export { getPusher }
