// src/app/api/gamebook/tower/climb/route.ts
//
// v3.8.2 — POST : monte ou descend un étage de la Tour des Pâtes Aiguës.
// Payload : { direction: "up" | "down" }
//
// Logique :
//   - Lit le state.mapId du progress courant pour déterminer l'étage actuel
//   - Direction "up" : check squats today >= threshold ET le serveur teleporte au floor+1
//                      Si déjà monté avant (towerFloorReached >= target) → bypass check
//   - Direction "down" : descente toujours gratuite
//   - Persiste le nouveau mapId + towerFloorReached + spawn (centre du nouvel étage)

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isGamebookFrozen } from "@/lib/gamebook/antiCheat"
import { TOWER_STAIRS_SQUATS_THRESHOLD, MAPS } from "@/lib/gamebook/maps"
import { getUserDifficultyRatio, applyRatio } from "@/lib/gamebook/difficulty"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const FLOOR_MAPS: Record<number, string> = {
    1: "tower_floor_1",
    2: "tower_floor_2",
    3: "tower_floor_3",
    4: "tower_floor_4",
    5: "tower_floor_5",
}

function floorFromMapId(mapId: string): number | null {
    const entry = Object.entries(FLOOR_MAPS).find(([, v]) => v === mapId)
    return entry ? Number(entry[0]) : null
}

async function getTodaySquats(userId: string): Promise<number> {
    const today = getTodayISO()
    const sets = await prisma.exerciseSet.findMany({
        where: { userId, date: today, exercise: "SQUAT" },
    })
    return sets.reduce((sum: number, s: { reps: number }) => sum + s.reps, 0)
}

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

    const direction = body.direction === "up" || body.direction === "down" ? body.direction : null
    if (!direction) {
        return NextResponse.json({ ok: false, reason: "direction requise (up | down)." }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }

    if (isGamebookFrozen(progress as { gamebookFrozenUntil?: Date | null })) {
        return NextResponse.json({
            ok: false,
            reason: "Gamebook gelé.",
            frozen: true,
            frozenUntil: (progress as { gamebookFrozenUntil?: Date | null }).gamebookFrozenUntil,
        })
    }

    const currentFloor = floorFromMapId(progress.mapId)
    if (currentFloor === null) {
        return NextResponse.json({ ok: false, reason: "Tu n'es pas dans la tour." })
    }

    const targetFloor = direction === "up" ? currentFloor + 1 : currentFloor - 1
    if (targetFloor < 1 || targetFloor > 5) {
        return NextResponse.json({ ok: false, reason: "Pas d'étage de ce côté." })
    }

    // Montée : check squats si pas encore débloqué
    if (direction === "up") {
        const alreadyReached = (progress.towerFloorReached ?? 1) >= targetFloor
        if (!alreadyReached) {
            // v3.8.5 — Mode créateur (isSystem) : bypass check squats.
            const creatorCheck = await (prisma as any).user.findUnique({
                where: { id: userId },
                select: { isSystem: true },
            })
            const isCreator = creatorCheck?.isSystem === true

            if (!isCreator) {
                const baseThreshold = TOWER_STAIRS_SQUATS_THRESHOLD[currentFloor]
                if (typeof baseThreshold !== "number") {
                    return NextResponse.json({ ok: false, reason: "Pas de seuil défini pour cet étage." })
                }
                // v3.10 — Ratio onboarding appliqué sur le seuil
                const ratio = await getUserDifficultyRatio(userId)
                const threshold = applyRatio(baseThreshold, ratio)
                const squatsToday = await getTodaySquats(userId)
                if (squatsToday < threshold) {
                    return NextResponse.json({
                        ok: false,
                        reason: `Il te manque des squats : ${squatsToday}/${threshold} aujourd'hui.`,
                        threshold,
                        squatsToday,
                    })
                }
            }
        }
    }

    // Calcule spawn (centre du nouvel étage)
    const targetMapId = FLOOR_MAPS[targetFloor]
    const targetMap = MAPS[targetMapId]
    if (!targetMap) {
        return NextResponse.json({ ok: false, reason: "Map introuvable côté serveur." }, { status: 500 })
    }

    // Spawn : si on monte → on arrive au centre-bas (sous le stairsUp), pour pouvoir redescendre
    //         si on descend → on arrive au centre-haut (au-dessus du stairsDown)
    const targetX = Math.floor(targetMap.width / 2)
    const targetY = direction === "up" ? targetMap.height - 2 : 2
    const targetDir = direction === "up" ? "up" : "down"

    const newReached = Math.max(progress.towerFloorReached ?? 1, targetFloor)

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            mapId: targetMapId,
            posX: targetX,
            posY: targetY,
            direction: targetDir,
            towerFloorReached: newReached,
            lastSeen: new Date(),
        },
    })

    return NextResponse.json({
        ok: true,
        floor: targetFloor,
        towerFloorReached: newReached,
        spawn: { mapId: targetMapId, posX: targetX, posY: targetY, direction: targetDir },
    })
}
