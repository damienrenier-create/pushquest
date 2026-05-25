// src/app/api/gamebook/painting/papa-boost/route.ts
//
// v3.17c — POST : le joueur a interagi avec le tableau de SON papa dans la Tour.
// Validation : nicknameMatch passé en body matche le nickname du joueur (case insensitive).
// One-shot via papaBoostClaimed. Récompense : +100 reps (= 10 pas de mouvement).
//
// Le client envoie { nicknameMatch } : le serveur compare et grant si OK.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isCreatorAccount, padAvailableEnergyForCreator } from "@/lib/gamebook/creator"
import { getUserDifficultyRatio, applyRatioToReward } from "@/lib/gamebook/ratio"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const PAPA_BOOST_REWARD = 100

async function getTodayReps(userId: string): Promise<number> {
    const today = getTodayISO()
    const sets = await prisma.exerciseSet.findMany({
        where: { userId, date: today },
    })
    // v3.23k — 1 sec de gainage = 1/5 énergie (cohérent avec scoring 5s=1pt)
    return sets.reduce((sum: number, s: { exercise: string; reps: number }) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps), 0)
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

    const nicknameMatch = typeof body.nicknameMatch === "string" ? body.nicknameMatch : null
    if (!nicknameMatch) {
        return NextResponse.json({ ok: false, reason: "nicknameMatch requis." }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }
    if ((progress as { papaBoostClaimed?: boolean }).papaBoostClaimed === true) {
        return NextResponse.json({ ok: false, reason: "Tu as déjà ressenti le souffle de ton père." })
    }

    // Vérifier que le nickname du joueur matche le tableau ciblé (case insensitive)
    const user = await (prisma as any).user.findUnique({
        where: { id: userId },
        select: { nickname: true },
    })
    if (!user?.nickname) {
        return NextResponse.json({ ok: false, reason: "Nickname introuvable." }, { status: 500 })
    }
    if (user.nickname.toLowerCase() !== nicknameMatch.toLowerCase()) {
        return NextResponse.json({ ok: false, reason: "Ce n'est pas le tableau de ton père." })
    }

    const today = getTodayISO()
    // v3.23e — ratio onboarding appliqué au reward (doctrine A1)
    const ratio = await getUserDifficultyRatio(userId)
    const reward = applyRatioToReward(PAPA_BOOST_REWARD, ratio)

    // v3.23f — Modèle bonusSurplus
    const { readEnergySnapshot, grantRewardOnSnapshot, computeAvailableEnergy } = await import("@/lib/gamebook/energy")
    const snap = readEnergySnapshot(progress, today)
    const nextSnap = grantRewardOnSnapshot(snap, reward, today)

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            papaBoostClaimed: true,
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
        availableEnergy,
        energySpentToday: nextSnap.energySpentToday,
        bonusSurplus: nextSnap.bonusSurplus,
    })
}
