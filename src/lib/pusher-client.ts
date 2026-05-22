// src/lib/pusher-client.ts
//
// Lib client Pusher pour le navigateur.
// Variables publiques requises (PUSHER_KEY et PUSHER_CLUSTER doivent être préfixés NEXT_PUBLIC_ pour être accessibles côté client).

"use client"

import PusherJS from "pusher-js"

const KEY = process.env.NEXT_PUBLIC_PUSHER_KEY
const CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER

export const PUSHER_CLIENT_ENABLED = Boolean(KEY && CLUSTER)

let pusherInstance: PusherJS | null = null

export function getPusherClient(): PusherJS | null {
    if (!PUSHER_CLIENT_ENABLED) return null
    if (pusherInstance) return pusherInstance
    pusherInstance = new PusherJS(KEY!, {
        cluster: CLUSTER!,
        forceTLS: true,
    })
    return pusherInstance
}

export function disconnectPusherClient(): void {
    if (pusherInstance) {
        pusherInstance.disconnect()
        pusherInstance = null
    }
}
