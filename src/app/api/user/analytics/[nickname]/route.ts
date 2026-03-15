import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { calculateAllUsersXP } from "@/lib/xp"

export const dynamic = "force-dynamic"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ nickname: string }> }
) {
    try {
        const { nickname } = await params
        const decodedNickname = decodeURIComponent(nickname)

        const user = await prisma.user.findFirst({
            where: { nickname: { equals: decodedNickname, mode: "insensitive" } },
            include: {
                sets: true,
                badges: {
                    include: { badge: true }
                },
                xpAdjustments: true
            }
        })

        if (!user) {
            return NextResponse.json({ message: "Utilisateur non trouvé" }, { status: 404 })
        }

        // 1. Get XP Breakdown using the existing logic (snapshot today)
        const allUsers = await prisma.user.findMany({
            include: {
                sets: true,
                xpAdjustments: true
            }
        })
        const allBadges = await prisma.badgeOwnership.findMany({
            include: { badge: true }
        })
        
        const rankings = await calculateAllUsersXP(allUsers, allBadges)
        const userXPInfo = rankings.find(r => r.id === user.id)

        // 2. Evolution of Max Series per day (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        const setsByDay = await prisma.exerciseSet.findMany({
            where: {
                userId: user.id,
                createdAt: { gte: thirtyDaysAgo }
            },
            orderBy: { createdAt: "asc" }
        })

        const maxSeriesHistory: Record<string, { PUSHUP: number, PULLUP: number, SQUAT: number }> = {}
        setsByDay.forEach(set => {
            const date = set.date
            if (!maxSeriesHistory[date]) {
                maxSeriesHistory[date] = { PUSHUP: 0, PULLUP: 0, SQUAT: 0 }
            }
            const exercise = set.exercise as "PUSHUP" | "PULLUP" | "SQUAT"
            if (set.reps > maxSeriesHistory[date][exercise]) {
                maxSeriesHistory[date][exercise] = set.reps
            }
        })

        const maxSeriesData = Object.entries(maxSeriesHistory).map(([date, values]) => ({
            date,
            ...values
        })).sort((a, b) => a.date.localeCompare(b.date))

        // 3. XP Progression (simulated by daily aggregates)
        // For simplicity, we'll return the daily sum of reps and badges achieved each day
        const dailyActivity: Record<string, { reps: number, badgesCount: number }> = {}
        
        setsByDay.forEach(set => {
            const date = set.date
            if (!dailyActivity[date]) dailyActivity[date] = { reps: 0, badgesCount: 0 }
            dailyActivity[date].reps += set.reps
        })

        user.badges.forEach(b => {
             const date = new Date(b.achievedAt).toISOString().split('T')[0]
             if (new Date(b.achievedAt) >= thirtyDaysAgo) {
                 if (!dailyActivity[date]) dailyActivity[date] = { reps: 0, badgesCount: 0 }
                 dailyActivity[date].badgesCount += 1
             }
        })

        const progressionData = Object.entries(dailyActivity).map(([date, val]) => ({
            date,
            reps: val.reps,
            badges: val.badgesCount
        })).sort((a, b) => a.date.localeCompare(b.date))

        return NextResponse.json({
            xpBreakdown: userXPInfo?.details || {},
            maxSeriesData,
            progressionData,
            totalXP: userXPInfo?.totalXP || 0
        })
    } catch (error) {
        console.error("Analytics API Error:", error)
        return NextResponse.json({ message: "Erreur" }, { status: 500 })
    }
}
