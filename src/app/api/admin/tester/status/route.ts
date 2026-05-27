// src/app/api/admin/tester/status/route.ts
//
// Panneau testeur — état actuel synthétique du tester (pour rafraîchir le panneau).

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireTester } from "@/lib/admin/requireTester"
import { getTodayISO } from "@/lib/challenge"
import { readEnergySnapshot, getTodayRepsForEnergy, computeAvailableEnergy } from "@/lib/gamebook/energy"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

export async function GET() {
    const auth = await requireTester()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const userId = auth.userId

    const today = getTodayISO()
    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }

    const todayReps = await getTodayRepsForEnergy(userId)
    const snap = readEnergySnapshot(progress, today)
    const availableEnergy = computeAvailableEnergy(todayReps, snap)

    const daemons = await (prisma as any).daemon.findMany({
        where: { userId },
        select: { id: true, slotIndex: true, name: true, type: true, combatLevel: true, currentHp: true, happiness: true, activeBattle: true, pendingStatPoints: true },
    })

    return NextResponse.json({
        ok: true,
        today,
        position: { mapId: progress.mapId, posX: progress.posX, posY: progress.posY, direction: progress.direction },
        energy: {
            todayReps,
            energySpentToday: snap.energySpentToday,
            bonusSurplus: snap.bonusSurplus,
            available: availableEnergy,
        },
        daemons,
        gamebookFrozenUntil: progress.gamebookFrozenUntil,
    })
}
