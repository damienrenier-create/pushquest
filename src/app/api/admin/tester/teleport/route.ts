// src/app/api/admin/tester/teleport/route.ts
//
// Panneau testeur — téléporte le compte tester vers (mapId, posX, posY, direction).
// Pas de check de walkability (le tester peut atterrir partout, même tile bloquante,
// puisque c'est lui qui décide).
//
// Body : { mapId, posX, posY, direction? }

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireTester } from "@/lib/admin/requireTester"
import { MAPS } from "@/lib/gamebook/maps"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

export async function GET() {
    const auth = await requireTester()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    // Renvoie la liste des maps connues + dimensions, pour aider le client à proposer.
    const maps = Object.values(MAPS).map((m) => ({
        id: m.id,
        name: m.name,
        width: m.width,
        height: m.height,
    }))
    return NextResponse.json({ ok: true, maps })
}

export async function POST(req: NextRequest) {
    const auth = await requireTester()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const userId = auth.userId

    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { /* empty */ }

    const mapId = typeof body.mapId === "string" ? body.mapId : null
    const posX = typeof body.posX === "number" ? Math.floor(body.posX) : null
    const posY = typeof body.posY === "number" ? Math.floor(body.posY) : null
    const direction = typeof body.direction === "string" ? body.direction : "down"

    if (!mapId || posX === null || posY === null) {
        return NextResponse.json({ ok: false, reason: "mapId, posX, posY required" }, { status: 400 })
    }
    if (!MAPS[mapId]) {
        return NextResponse.json({ ok: false, reason: `mapId "${mapId}" inconnu` }, { status: 400 })
    }

    await (prisma as any).gamebookProgress.update({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
        data: { mapId, posX, posY, direction },
    })
    return NextResponse.json({ ok: true, mapId, posX, posY, direction })
}
