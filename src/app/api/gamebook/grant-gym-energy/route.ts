// src/app/api/gamebook/grant-gym-energy/route.ts
//
// POST /api/gamebook/grant-gym-energy
//
// Le PNJ BUFFY de la salle de muscu donne 100 reps d'énergie au joueur (une seule fois).
// Côté serveur : on décrémente energySpentToday de 100 (anti-cheat : empêche les rejouages).
// Atomic : si gymGuyEnergyGiven était déjà true, on refuse.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isCreatorAccount, padAvailableEnergyForCreator } from "@/lib/gamebook/creator"
import { getUserDifficultyRatio, applyRatio } from "@/lib/gamebook/difficulty"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const GYM_GUY_REWARD = 100

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

    const progress = await prisma.gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ error: "No progress" }, { status: 400 })
    }
    if (progress.phase !== "playing") {
        return NextResponse.json({
            ok: false,
            reason: "Tu dois d'abord rencontrer le Monstre.",
        })
    }
    const gymGuyAlready = (progress as { gymGuyEnergyGiven?: boolean }).gymGuyEnergyGiven === true
    if (gymGuyAlready) {
        return NextResponse.json({
            ok: false,
            reason: "BUFFY t'a déjà donné de l'énergie.",
        })
    }

    const today = getTodayISO()
    // v3.10.1 — Reward ajusté au ratio de difficulté
    const ratio = await getUserDifficultyRatio(userId)
    const reward = applyRatio(GYM_GUY_REWARD, ratio)

    // v3.23f — Modèle bonusSurplus : le reward s'accumule dans bonusSurplus (persistant)
    const { readEnergySnapshot, grantRewardOnSnapshot, computeAvailableEnergy } = await import("@/lib/gamebook/energy")
    const snap = readEnergySnapshot(progress, today)
    const nextSnap = grantRewardOnSnapshot(snap, reward, today)

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            energySpentToday: nextSnap.energySpentToday,
            energySpentDate: nextSnap.energySpentDate,
            bonusSurplus: nextSnap.bonusSurplus,
            gymGuyEnergyGiven: true,
            lastSeen: new Date(),
        },
    })

    const todayReps = await getTodayReps(userId)
    const isCreator = await isCreatorAccount(userId)
    const availableEnergy = padAvailableEnergyForCreator(computeAvailableEnergy(todayReps, nextSnap), isCreator)

    return NextResponse.json({
        ok: true,
        availableEnergy,
        energySpentToday: nextSnap.energySpentToday,
        bonusSurplus: nextSnap.bonusSurplus,
        reward,
    })
}
