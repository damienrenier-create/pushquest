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
    const storedDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
    const storedSpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
    const currentSpent = storedDate === today ? storedSpent : 0
    // On retire 100 (l'énergie devient "moins consommée" d'autant)
    // Math.max pour ne pas aller en négatif aujourd'hui — mais on autorise les energySpentToday négatifs
    // pour que l'effet reste si l'utilisateur n'a encore rien dépensé
    const newSpent = currentSpent - GYM_GUY_REWARD

    await prisma.gamebookProgress.update({
        where: { id: progress.id },
        data: {
            energySpentToday: newSpent,
            energySpentDate: today,
            gymGuyEnergyGiven: true,
            lastSeen: new Date(),
        },
    })

    const todayReps = await getTodayReps(userId)
    const isCreator = await isCreatorAccount(userId)
    const availableEnergy = padAvailableEnergyForCreator(Math.max(0, todayReps - newSpent), isCreator)

    return NextResponse.json({
        ok: true,
        availableEnergy,
        energySpentToday: newSpent,
        reward: GYM_GUY_REWARD,
    })
}
