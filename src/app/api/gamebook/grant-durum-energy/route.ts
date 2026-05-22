// src/app/api/gamebook/grant-durum-energy/route.ts
//
// v3.8 — POST : DURUM (gym_pepite) donne +50 reps au joueur (1ère fois uniquement).
// Idempotent via le flag `durumEnergyGiven` (équivalent à `gymGuyEnergyGiven` pour BUFFY).
// Refusé si frozen.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isGamebookFrozen } from "@/lib/gamebook/antiCheat"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const REWARD = 50

async function getTodayReps(userId: string): Promise<number> {
    const today = getTodayISO()
    const sets = await prisma.exerciseSet.findMany({
        where: { userId, date: today },
    })
    return sets.reduce((sum: number, s: { reps: number }) => sum + s.reps, 0)
}

export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

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

    if ((progress as { durumEnergyGiven?: boolean }).durumEnergyGiven === true) {
        return NextResponse.json({ ok: false, reason: "DURUM hausse les épaules. Il t'a déjà donné." })
    }

    const today = getTodayISO()
    const storedDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
    const storedSpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
    const currentSpent = storedDate === today ? storedSpent : 0
    const todayReps = await getTodayReps(userId)

    // Crédite +50 : energySpentToday -= 50 (peut devenir négatif → cohérent v3.8)
    const newSpent = currentSpent - REWARD
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            energySpentToday: newSpent,
            energySpentDate: today,
            durumEnergyGiven: true,
            lastSeen: new Date(),
        },
    })

    return NextResponse.json({
        ok: true,
        reward: REWARD,
        availableEnergy: todayReps - newSpent,
        energySpentToday: newSpent,
    })
}
