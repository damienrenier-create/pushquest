// src/app/api/gamebook/pastavegas/shoptower-climb/route.ts
//
// v4.0 — POST : monte/descend dans la Tour Pullman de PastaVegas.
//
// Body : { direction: "up" | "down" }
//
// 4 étages :
//   1 (RDC)  : Apothicairerie — MARY MALONE
//   2        : Forge — IOREK
//   3        : Transport — LEE SCORESBY  (requires pastagoneBossBeaten)
//   4 (caché): Magie — SERAFINA          (requires pastagoneBossBeaten + Serafina rencontrée Macaron'île)
//
// Réponse : { ok, spawn: { mapId, posX, posY, direction } }

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

const FLOOR_BY_MAPID: Record<string, number> = {
    vegas_shoptower_1: 1,
    vegas_shoptower_2: 2,
    vegas_shoptower_3: 3,
    vegas_shoptower_4: 4,
}

const MAPID_BY_FLOOR: Record<number, string> = {
    1: "vegas_shoptower_1",
    2: "vegas_shoptower_2",
    3: "vegas_shoptower_3",
    4: "vegas_shoptower_4",
}

// Position d'arrivée sur l'étage cible : à côté de l'escalier opposé
//   - Monter → spawn sur stairsDown (x=1, y=5) de l'étage cible (haut)
//   - Descendre → spawn sur stairsUp (x=7, y=5) de l'étage cible (bas)
function spawnForFloor(floor: number, came: "up" | "down"): { posX: number; posY: number; direction: "up" | "down" | "left" | "right" } {
    // came="up" = on est monté → on arrive à l'étage supérieur côté escalier-down (x=1)
    // came="down" = on est descendu → on arrive à l'étage inférieur côté escalier-up (x=7)
    if (came === "up") return { posX: 2, posY: 5, direction: "right" }
    return { posX: 6, posY: 5, direction: "left" }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { direction?: string }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const dir = body.direction === "up" || body.direction === "down" ? body.direction : null
    if (!dir) return NextResponse.json({ ok: false, reason: "direction up|down requise" }, { status: 400 })

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    const currentMapId = progress.mapId as string
    const currentFloor = FLOOR_BY_MAPID[currentMapId]
    if (!currentFloor) {
        return NextResponse.json({ ok: false, reason: "Pas dans la Tour PastaVegas." }, { status: 400 })
    }

    const targetFloor = dir === "up" ? currentFloor + 1 : currentFloor - 1
    if (targetFloor < 1 || targetFloor > 4) {
        return NextResponse.json({ ok: false, reason: "Pas d'étage à cette direction." }, { status: 400 })
    }

    // Gating
    if (targetFloor === 3 && progress.pastagoneBossBeaten !== true) {
        return NextResponse.json({ ok: false, reason: "Cet étage est verrouillé. Reviens après avoir battu le Chef Asriel." }, { status: 403 })
    }
    if (targetFloor === 4) {
        if (progress.pastagoneBossBeaten !== true) {
            return NextResponse.json({ ok: false, reason: "Cet étage caché ne se révèle qu'aux vainqueurs du Chef." }, { status: 403 })
        }
        // L'étage caché requiert aussi d'avoir parlé à Serafina Pekkala (Macaron'île)
        const talkedSerafina = Array.isArray(progress.npcsTalkedTo) && progress.npcsTalkedTo.includes("serafina_pekkala")
        if (!talkedSerafina) {
            return NextResponse.json({ ok: false, reason: "L'escalier disparaît dans le brouillard. As-tu rencontré la sorcière des Nords ?" }, { status: 403 })
        }
    }

    const targetMapId = MAPID_BY_FLOOR[targetFloor]
    const spawn = spawnForFloor(targetFloor, dir)

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            mapId: targetMapId,
            posX: spawn.posX,
            posY: spawn.posY,
            direction: spawn.direction,
            lastSeen: new Date(),
        },
    })

    return NextResponse.json({
        ok: true,
        spawn: { mapId: targetMapId, ...spawn },
        floor: targetFloor,
    })
}
