// src/app/api/gamebook/yellow/broadcast/route.ts
//
// POST /api/gamebook/yellow/broadcast
//   body: { channel, type, ...payload }
//
// Relai temps réel du Nexus Jaune (casino multijoueur + défis + combat PvP).
// Le client poste ici ; le serveur ajoute l'identité authentifiée (userId +
// nickname) et publie sur Pusher. Anti-usurpation : on ne peut pas émettre au nom
// d'un autre. Contrairement à la route v3, les comptes isSystem SONT autorisés
// (le chapitre yellow est créateur-gated : c'est Sartay qui teste).
//
// Canaux autorisés : "yellow_casino" / "yellow_autel" / "yellow_nexus" (présence, chat, défi, échange),
// "yellow_battle_<id>" (combat) et les canaux de présence PAR CARTE des lieux sociaux (multiplayer/presenceMaps,
// messages de présence seulement).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getPusher, PUSHER_ENABLED } from "@/lib/pusher"
import { isMapPresenceChannel } from "@/lib/gamebook/yellow/multiplayer/presenceMaps"

export const dynamic = "force-dynamic"

// Throttle anti-flood : 1 message / 120ms / user (un peu plus permissif que v3
// pour fluidifier les déplacements casino, mais borné pour le quota Sandbox).
const lastByUser: Map<string, number> = new Map()
const THROTTLE_MS = 120

// Types d'évènements autorisés (présence + défi + combat).
const VALID_TYPES = new Set([
    "player:move", "player:hello", "player:disconnect", "player:away",
    "challenge:send", "challenge:cancel", "challenge:respond",
    "battle:action", "battle:state", "battle:forfeit", "battle:hello",
    "chat:say",
    "trade:offer", "trade:cancel", "trade:respond", "trade:confirm",
    "cttrade:offer", "cttrade:cancel", "cttrade:respond", "cttrade:confirm",
])

// player:away = onglet caché : retiré de la PRÉSENCE seulement. Ce n'est pas un départ : les échanges et les défis en
//   cours (qui écoutent player:disconnect) ne doivent pas se fermer d'un seul côté.
const PRESENCE_TYPES = new Set(["player:move", "player:hello", "player:disconnect", "player:away"])

/** Un canal yellow valide : présence casino, salle de fusion, présence GLOBALE (fun), présence d'un LIEU SOCIAL, OU un combat privé. */
function isValidChannel(ch: string): boolean {
    return ch === "yellow_casino" || ch === "yellow_autel" || ch === "yellow_nexus" || isMapPresenceChannel(ch) || /^yellow_battle_[A-Za-z0-9_-]{4,120}$/.test(ch)
}

// PSEUDO : pour la PRÉSENCE (un message par pas), lu en base au plus une fois par minute et par instance au lieu d'une
//   requête Neon à chaque pas. Chat, défi et échange (rares, et le pseudo d'un échange est gravé comme dresseur
//   d'origine du Daemon reçu) le relisent toujours en base : un pseudo changé y apparaît aussitôt.
const nickCache: Map<string, { nick: string; at: number }> = new Map()
const NICK_TTL_MS = 60 * 1000
async function nicknameOf(userId: string, cached: boolean): Promise<string> {
    const hit = nickCache.get(userId)
    if (cached && hit && Date.now() - hit.at < NICK_TTL_MS) return hit.nick
    try {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } })
        const nick = user?.nickname ?? "?"
        if (nickCache.size > 500) nickCache.clear()
        nickCache.set(userId, { nick, at: Date.now() })
        return nick
    } catch (e) {
        console.warn("[yellow/broadcast] user lookup failed", e)
        return hit?.nick ?? "?"
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!PUSHER_ENABLED) {
        return NextResponse.json({ ok: true, published: false, reason: "Pusher disabled" })
    }

    // Throttle (le battle:action et les hello passent toujours pour rester réactifs).
    let body: Record<string, unknown>
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }

    const type = typeof body.type === "string" ? body.type : ""
    const channel = typeof body.channel === "string" ? body.channel : ""
    if (!VALID_TYPES.has(type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    if (!isValidChannel(channel)) return NextResponse.json({ error: "Invalid channel" }, { status: 400 })
    // Les canaux d'un lieu social ne portent que la présence (on s'y voit ; défi, échange et chat restent au casino).
    if (isMapPresenceChannel(channel) && !PRESENCE_TYPES.has(type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 })

    const throttled = type === "player:move" || type === "chat:say" // anti-flood
    if (throttled) {
        const now = Date.now()
        // #10 — throttle SÉPARÉ par (user, canal, type) : un chat juste après un pas n'est plus avalé en 429 par le
        //   throttle de déplacement (et inversement), et le pas d'un compte fun publié sur la carte ET sur yellow_nexus
        //   au même instant n'est plus refusé sur l'un des deux.
        const key = `${userId}:${channel}:${type}`
        const last = lastByUser.get(key) ?? 0
        if (now - last < THROTTLE_MS) return NextResponse.json({ ok: false, reason: "Rate limited" }, { status: 429 })
        lastByUser.set(key, now)
    }

    // Identité (nickname) depuis la base (cache court pour la présence) — jamais fournie par le client.
    const nickname = await nicknameOf(userId, PRESENCE_TYPES.has(type))

    // Payload filtré (le client ne contrôle ni userId ni nickname).
    const payload: Record<string, unknown> = {
        type,
        userId,
        nickname,
        posX: typeof body.posX === "number" ? body.posX : undefined,
        posY: typeof body.posY === "number" ? body.posY : undefined,
        direction: typeof body.direction === "string" ? body.direction : undefined,
        avatar: typeof body.avatar === "string" ? body.avatar : undefined, // FASHION VICTIM : avatar Gen3 diffusé aux autres joueurs
        targetUserId: typeof body.targetUserId === "string" ? body.targetUserId : undefined,
        accepted: typeof body.accepted === "boolean" ? body.accepted : undefined,
        battleId: typeof body.battleId === "string" ? body.battleId : undefined,
        // `data` : charge utile libre (action de combat, état relayé…). Bornée à 8 Ko.
        data: typeof body.data === "object" && body.data !== null ? body.data : undefined,
        timestamp: Date.now(),
    }

    // L'ÉMETTEUR ne reçoit pas sa propre copie (il l'ignorait déjà) : chaque copie livrée compte dans le quota Pusher.
    const socketId = typeof body.socketId === "string" && /^\d{1,20}\.\d{1,20}$/.test(body.socketId) ? body.socketId : undefined

    const pusher = getPusher()
    if (!pusher) return NextResponse.json({ ok: true, published: false, reason: "Pusher unavailable" })
    try {
        if (socketId) await pusher.trigger(`gamebook-${channel}`, type, payload, { socket_id: socketId })
        else await pusher.trigger(`gamebook-${channel}`, type, payload)
        return NextResponse.json({ ok: true, published: true })
    } catch (e) {
        console.warn("[yellow/broadcast] publish failed", e)
        return NextResponse.json({ ok: false, published: false }, { status: 200 })
    }
}
