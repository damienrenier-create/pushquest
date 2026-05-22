// src/app/api/gamebook/pusher-auth/route.ts
//
// POST /api/gamebook/pusher-auth
//   Endpoint d'authentification pour les canaux Pusher privés (préfixe "private-").
//   Pour l'instant on utilise des canaux publics, mais cette route est prête au cas où.
//
// Si Pusher n'est pas configuré, retourne 503.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPusher, PUSHER_ENABLED } from "@/lib/pusher"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
    if (!PUSHER_ENABLED) {
        return NextResponse.json({ error: "Pusher disabled" }, { status: 503 })
    }
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    const formData = await req.formData()
    const socketId = formData.get("socket_id")?.toString()
    const channel = formData.get("channel_name")?.toString()
    if (!socketId || !channel) {
        return NextResponse.json({ error: "Invalid params" }, { status: 400 })
    }

    const pusher = getPusher()
    if (!pusher) {
        return NextResponse.json({ error: "Pusher unavailable" }, { status: 503 })
    }

    const authResponse = pusher.authorizeChannel(socketId, channel, {
        user_id: userId,
        user_info: { userId },
    })
    return NextResponse.json(authResponse)
}
