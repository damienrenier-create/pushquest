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
import { readEnergySnapshot, spendEnergyOnSnapshot, computeAvailableEnergy } from "@/lib/gamebook/energy"
import {
    applyFeed,
    parseTamagotchi,
    TAMAGOTCHI_FEED_COST,
    viewTamagotchi,
} from "@/lib/gamebook/tamagotchi"
import { getUserLevelForGamebook } from "@/lib/gamebook/userLevel"
import { getUserDifficultyRatio, applyRatioToCost } from "@/lib/gamebook/ratio"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

async function getTodayReps(userId: string): Promise<number> {
    const today = getTodayISO()
    const sets = await prisma.exerciseSet.findMany({
        where: { userId, date: today },
    })
    // v3.23k — 1 sec de gainage = 1/5 énergie (cohérent avec scoring 5s=1pt)
    return sets.reduce((sum: number, s: { exercise: string; reps: number }) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps), 0)
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
    const snap = readEnergySnapshot(progress, today)
    const todayReps = await getTodayReps(userId)
    const isCreator = await isCreatorAccount(userId)
    const availableEnergy = padAvailableEnergyForCreator(computeAvailableEnergy(todayReps, snap), isCreator)

    // v3.23e — ratio appliqué au coût (doctrine E1 : coût feed ratio-aware)
    const ratio = await getUserDifficultyRatio(userId)
    const feedCost = applyRatioToCost(TAMAGOTCHI_FEED_COST, ratio)

    if (availableEnergy < feedCost) {
        return NextResponse.json({
            ok: false,
            reason: `Nourrir : ${feedCost} reps. Il t'en manque ${feedCost - availableEnergy}.`,
        })
    }

    const nextSnap = spendEnergyOnSnapshot(snap, feedCost, today)
    const userLevel = await getUserLevelForGamebook(userId)
    const fed = applyFeed(existing, userLevel)

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            tamagotchi: fed,
            energySpentToday: nextSnap.energySpentToday,
            energySpentDate: today,
            bonusSurplus: nextSnap.bonusSurplus,
            lastSeen: new Date(),
        },
    })

    return NextResponse.json({
        ok: true,
        tamagotchi: viewTamagotchi(fed, userLevel),
        availableEnergy: padAvailableEnergyForCreator(computeAvailableEnergy(todayReps, nextSnap), isCreator),
        energySpentToday: nextSnap.energySpentToday,
        bonusSurplus: nextSnap.bonusSurplus,
    })
}
