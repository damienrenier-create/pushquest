// src/app/api/gamebook/tamagotchi/feed/route.ts
//
// v3.14 — POST : nourrir son tamagotchi (chez le vétérinaire de Macaron'île).
//
// Pré-requis :
//   - Joueur sur la map "veterinaire"
//   - Tamagotchi adopté
//   - Énergie disponible >= TAMAGOTCHI_FEED_COST
//
// Effet :
//   - Applique applyFeed (happiness +30, feedCount++, lastFedAt = now, stage recalculé)
//   - Débite TAMAGOTCHI_FEED_COST reps de l'énergie du jour
//   - Renvoie le tamagotchi avec happiness/stage recalculés

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isGamebookFrozen } from "@/lib/gamebook/antiCheat"
import { isCreatorAccount, padAvailableEnergyForCreator } from "@/lib/gamebook/creator"
import {
    applyFeed,
    parseTamagotchi,
    TAMAGOTCHI_FEED_COST,
    viewTamagotchi,
} from "@/lib/gamebook/tamagotchi"
import { getUserLevelForGamebook } from "@/lib/gamebook/userLevel"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

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

    if (progress.mapId !== "veterinaire") {
        return NextResponse.json({ ok: false, reason: "Tu n'es pas chez le vétérinaire." })
    }

    const existing = parseTamagotchi(progress.tamagotchi)
    if (!existing) {
        return NextResponse.json({ ok: false, reason: "Tu n'as pas de tamagotchi à nourrir." })
    }

    const today = getTodayISO()
    const storedDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
    const storedSpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
    const currentSpent = storedDate === today ? storedSpent : 0
    const todayReps = await getTodayReps(userId)
    const isCreator = await isCreatorAccount(userId)
    const availableEnergy = padAvailableEnergyForCreator(todayReps - currentSpent, isCreator)

    if (availableEnergy < TAMAGOTCHI_FEED_COST) {
        return NextResponse.json({
            ok: false,
            reason: `Nourrir : ${TAMAGOTCHI_FEED_COST} reps. Il t'en manque ${TAMAGOTCHI_FEED_COST - availableEnergy}.`,
        })
    }

    const newSpent = currentSpent + TAMAGOTCHI_FEED_COST
    const userLevel = await getUserLevelForGamebook(userId)
    const fed = applyFeed(existing, userLevel)

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            tamagotchi: fed,
            energySpentToday: newSpent,
            energySpentDate: today,
            lastSeen: new Date(),
        },
    })

    return NextResponse.json({
        ok: true,
        tamagotchi: viewTamagotchi(fed, userLevel),
        availableEnergy: padAvailableEnergyForCreator(todayReps - newSpent, isCreator),
        energySpentToday: newSpent,
    })
}
