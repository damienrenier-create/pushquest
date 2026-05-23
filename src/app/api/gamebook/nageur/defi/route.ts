// src/app/api/gamebook/nageur/defi/route.ts
//
// v3.17c — POST : valider le défi du Nageur de la mer.
// Pré-requis :
//   - Player sur la map "la_mer"
//   - !nageurDefiCompleted (one-shot à vie)
//   - >= 50 pompes (PUSHUP) effectuées aujourd'hui
//
// Effet :
//   - +100 reps d'énergie (via décrément de energySpentToday)
//   - nageurDefiCompleted = true
//
// Pas d'EmberCoins (Q m). Pas de badge dédié pour le moment.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isCreatorAccount, padAvailableEnergyForCreator } from "@/lib/gamebook/creator"
import { parseInventory } from "@/lib/gamebook/inventory"
import { applyRewardBonus } from "@/lib/gamebook/items"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const NAGEUR_DEFI_REWARD = 100
const NAGEUR_DEFI_THRESHOLD = 50

async function getTodayPushups(userId: string): Promise<number> {
    const today = getTodayISO()
    const sets = await prisma.exerciseSet.findMany({
        where: { userId, date: today, exercise: "PUSHUP" },
    })
    return sets.reduce((sum: number, s: { reps: number }) => sum + s.reps, 0)
}

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
    if (progress.mapId !== "la_mer") {
        return NextResponse.json({ ok: false, reason: "Tu n'es pas dans la mer." })
    }
    if ((progress as { nageurDefiCompleted?: boolean }).nageurDefiCompleted === true) {
        return NextResponse.json({ ok: false, reason: "Tu as déjà réussi ce défi." })
    }

    const pushupsToday = await getTodayPushups(userId)
    if (pushupsToday < NAGEUR_DEFI_THRESHOLD) {
        return NextResponse.json({
            ok: false,
            reason: `Il te faut ${NAGEUR_DEFI_THRESHOLD} pompes aujourd'hui (tu en as ${pushupsToday}). Reviens quand t'es prêt.`,
            pushupsToday,
            threshold: NAGEUR_DEFI_THRESHOLD,
        })
    }

    const today = getTodayISO()
    const storedDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
    const storedSpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
    const currentSpent = storedDate === today ? storedSpent : 0
    // v3.17d — Bonus Lunettes : +10% si l'utilisateur a des lunettes intactes
    const inventory = parseInventory((progress as { inventory?: unknown }).inventory)
    const reward = applyRewardBonus(NAGEUR_DEFI_REWARD, inventory)
    const newSpent = currentSpent - reward  // crédit = décrément

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            nageurDefiCompleted: true,
            energySpentToday: newSpent,
            energySpentDate: today,
            lastSeen: new Date(),
        },
    })

    const todayReps = await getTodayReps(userId)
    const isCreator = await isCreatorAccount(userId)
    const availableEnergy = padAvailableEnergyForCreator(todayReps - newSpent, isCreator)

    return NextResponse.json({
        ok: true,
        reward,
        baseReward: NAGEUR_DEFI_REWARD,
        availableEnergy,
        energySpentToday: newSpent,
    })
}
