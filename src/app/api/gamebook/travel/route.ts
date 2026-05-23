// src/app/api/gamebook/travel/route.ts
//
// v3.22 — POST : fast travel vers une ville débloquée.
// Body : { townId: "bourgpates" | "pepiteville" | "hautespates" | "macaron_ile" | "muscuville" }
//
// Pré-requis :
//   - townId présent dans visitedTowns (sinon refus)
//   - Pas frozen
//   - Pas dans un bâtiment intérieur (UX : on retourne d'une ville)
//
// Effet :
//   - Téléport gratuit vers le spawn point de la ville
//   - Met à jour mapId/posX/posY/direction du progress

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isGamebookFrozen } from "@/lib/gamebook/antiCheat"
import { TOWN_SPAWN_POINTS, TRAVEL_TOWN_IDS, type TravelTownId } from "@/lib/gamebook/maps"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: Record<string, unknown>
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    const townId = body.townId
    if (typeof townId !== "string" || !TRAVEL_TOWN_IDS.includes(townId as TravelTownId)) {
        return NextResponse.json({ ok: false, reason: "Ville inconnue." }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }
    if (isGamebookFrozen(progress as { gamebookFrozenUntil?: Date | null })) {
        return NextResponse.json({ ok: false, reason: "Gamebook gelé.", frozen: true })
    }

    const visited: string[] = Array.isArray((progress as { visitedTowns?: unknown }).visitedTowns)
        ? (progress as { visitedTowns: string[] }).visitedTowns
        : []
    if (!visited.includes(townId)) {
        return NextResponse.json({
            ok: false,
            reason: "Tu n'as pas encore visité cette ville à pied.",
        })
    }

    const spawn = TOWN_SPAWN_POINTS[townId as TravelTownId]
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            mapId: spawn.mapId,
            posX: spawn.posX,
            posY: spawn.posY,
            direction: spawn.direction,
            lastSeen: new Date(),
        },
    })

    return NextResponse.json({
        ok: true,
        spawn,
    })
}
