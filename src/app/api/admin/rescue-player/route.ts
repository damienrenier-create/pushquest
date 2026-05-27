// src/app/api/admin/rescue-player/route.ts
//
// v4.0 — Endpoint admin (isSystem=true uniquement) pour téléporter d'urgence
// un joueur coincé sur une tile invalide ou en superposition d'un PNJ.
//
// Body : { nickname: string, spawn?: "bourgpates" | "pepiteville_shop_door" | "macaron_ile" }
//
// spawn défaut = "bourgpates" (origine). Possibilité de cibler une porte
// spécifique pour un débug ciblé.
//
// Renvoie l'état modifié.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

interface Spawn {
    mapId: string
    posX: number
    posY: number
    direction: "up" | "down" | "left" | "right"
}

const SPAWN_PRESETS: Record<string, Spawn> = {
    bourgpates:                { mapId: "bourgpates",    posX: 7,  posY: 12, direction: "down" },
    pepiteville:               { mapId: "pepiteville",   posX: 11, posY: 8,  direction: "down" },
    pepiteville_shop_door:     { mapId: "pepiteville",   posX: 11, posY: 8,  direction: "down" },
    macaron_ile:               { mapId: "macaron_ile",   posX: 7,  posY: 12, direction: "down" },
    muscuville:                { mapId: "muscuville",    posX: 8,  posY: 14, direction: "down" },
    lasagnas_vegas:            { mapId: "lasagnas_vegas", posX: 11, posY: 12, direction: "down" },
    hautespates:               { mapId: "hautespates",   posX: 5,  posY: 11, direction: "down" },
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const callerId = (session.user as { id: string }).id

    // Gate isSystem (créateur uniquement)
    const caller = await (prisma as any).user.findUnique({
        where: { id: callerId },
        select: { isSystem: true },
    })
    if (caller?.isSystem !== true) {
        return NextResponse.json({ error: "Forbidden — créateur uniquement" }, { status: 403 })
    }

    let body: { nickname?: string; spawn?: string }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const nickname = body.nickname
    if (!nickname) return NextResponse.json({ ok: false, reason: "nickname requis" }, { status: 400 })

    const targetUser = await (prisma as any).user.findUnique({
        where: { nickname },
        select: { id: true, nickname: true },
    })
    if (!targetUser) {
        return NextResponse.json({ ok: false, reason: `Aucun user avec nickname '${nickname}'.` }, { status: 404 })
    }

    const spawnKey = body.spawn ?? "bourgpates"
    const spawn = SPAWN_PRESETS[spawnKey]
    if (!spawn) {
        return NextResponse.json({
            ok: false,
            reason: `Spawn '${spawnKey}' inconnu. Options : ${Object.keys(SPAWN_PRESETS).join(", ")}`,
        }, { status: 400 })
    }

    const before = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId: targetUser.id, chapterId: CHAPTER_ID } },
    })
    if (!before) {
        return NextResponse.json({ ok: false, reason: "Pas de progress (joueur n'a jamais joué)." }, { status: 404 })
    }

    const updated = await (prisma as any).gamebookProgress.update({
        where: { id: before.id },
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
        rescued: targetUser.nickname,
        before: { mapId: before.mapId, posX: before.posX, posY: before.posY },
        after: { mapId: updated.mapId, posX: updated.posX, posY: updated.posY },
        spawnUsed: spawnKey,
    })
}
