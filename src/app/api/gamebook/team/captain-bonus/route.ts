// src/app/api/gamebook/team/captain-bonus/route.ts
//
// v3.24a — POST : le joueur réclame le bonus quotidien de son capitaine d'équipe.
// Body : { team: "RED" | "YELLOW" } (côté client, on envoie le team du PNJ ciblé).
//
// Validation :
//   - Le joueur doit appartenir à l'équipe ciblée (TEAM_MEMBERSHIPS).
//   - Pas déjà claim aujourd'hui (lastTeamCaptainBonusDate).
//
// Récompense : +30 reps (soustrait de energySpentToday pour artificiellement
// augmenter l'énergie dispo, sans toucher aux ExerciseSet).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isCreatorAccount, padAvailableEnergyForCreator } from "@/lib/gamebook/creator"
import { getTeamForUser, TEAM_CAPTAIN_BONUS_REPS } from "@/lib/gamebook/teams"
import { getUserDifficultyRatio, applyRatioToReward } from "@/lib/gamebook/ratio"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

async function getTodayReps(userId: string): Promise<number> {
    const today = getTodayISO()
    const sets = await prisma.exerciseSet.findMany({
        where: { userId, date: today },
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

    const targetTeam = body.team
    if (targetTeam !== "RED" && targetTeam !== "YELLOW") {
        return NextResponse.json({ ok: false, reason: "team invalide." }, { status: 400 })
    }

    const playerTeam = getTeamForUser(userId)
    if (playerTeam === "NONE") {
        return NextResponse.json({
            ok: false,
            reason: "Tu n'as pas d'équipe. Le capitaine te sourit poliment et te tend… rien.",
        })
    }
    if (playerTeam !== targetTeam) {
        return NextResponse.json({
            ok: false,
            reason: `Tu n'es pas dans l'Équipe ${targetTeam === "RED" ? "Rouge" : "Jaune"}. Va voir ton vrai capitaine.`,
        })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }

    const today = getTodayISO()
    const lastDate = (progress as { lastTeamCaptainBonusDate?: string }).lastTeamCaptainBonusDate ?? ""
    if (lastDate === today) {
        return NextResponse.json({
            ok: false,
            reason: "Tu as déjà encaissé ton bonus aujourd'hui. Reviens demain.",
        })
    }

    const storedDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
    const storedSpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
    const currentSpent = storedDate === today ? storedSpent : 0
    // v3.23e — ratio appliqué au reward (doctrine A1)
    const ratio = await getUserDifficultyRatio(userId)
    const reward = applyRatioToReward(TEAM_CAPTAIN_BONUS_REPS, ratio)
    const newSpent = currentSpent - reward

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            lastTeamCaptainBonusDate: today,
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
        team: playerTeam,
        availableEnergy,
        energySpentToday: newSpent,
    })
}
