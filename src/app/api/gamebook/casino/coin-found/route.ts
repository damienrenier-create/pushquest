// src/app/api/gamebook/casino/coin-found/route.ts
//
// v3.17c — POST : le joueur a trouvé la case cachée +50 reps du casino de Bourg-Boulette.
// One-shot via le flag bourgCasinoCoinsFound.
// Gating : doit être sur la map "casino" (Bourg-Boulette).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isCreatorAccount, padAvailableEnergyForCreator } from "@/lib/gamebook/creator"
import { parseInventory } from "@/lib/gamebook/inventory"
import { applyRewardBonus } from "@/lib/gamebook/items"
import { getUserDifficultyRatio, applyRatioToReward } from "@/lib/gamebook/ratio"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const CASINO_HIDDEN_REWARD = 50

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
    if (progress.mapId !== "casino") {
        return NextResponse.json({ ok: false, reason: "Tu n'es pas au casino de Bourg-Boulette." })
    }
    if ((progress as { bourgCasinoCoinsFound?: boolean }).bourgCasinoCoinsFound === true) {
        return NextResponse.json({ ok: false, reason: "Tu as déjà ramassé ces pièces." })
    }

    const today = getTodayISO()
    // v3.17d — Bonus Lunettes : +10% si l'utilisateur a des lunettes intactes
    // v3.23e — ratio appliqué AVANT le bonus lunettes (doctrine A1)
    const inventory = parseInventory((progress as { inventory?: unknown }).inventory)
    const ratio = await getUserDifficultyRatio(userId)
    const ratioedReward = applyRatioToReward(CASINO_HIDDEN_REWARD, ratio)
    const reward = applyRewardBonus(ratioedReward, inventory)

    // v3.23f — Modèle bonusSurplus
    const { readEnergySnapshot, grantRewardOnSnapshot, computeAvailableEnergy } = await import("@/lib/gamebook/energy")
    const snap = readEnergySnapshot(progress, today)
    const nextSnap = grantRewardOnSnapshot(snap, reward, today)

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            bourgCasinoCoinsFound: true,
            energySpentToday: nextSnap.energySpentToday,
            energySpentDate: nextSnap.energySpentDate,
            bonusSurplus: nextSnap.bonusSurplus,
            lastSeen: new Date(),
        },
    })

    const todayReps = await getTodayReps(userId)
    const isCreator = await isCreatorAccount(userId)
    const availableEnergy = padAvailableEnergyForCreator(computeAvailableEnergy(todayReps, nextSnap), isCreator)

    return NextResponse.json({
        ok: true,
        reward,
        baseReward: CASINO_HIDDEN_REWARD,
        availableEnergy,
        energySpentToday: nextSnap.energySpentToday,
        bonusSurplus: nextSnap.bonusSurplus,
    })
}
