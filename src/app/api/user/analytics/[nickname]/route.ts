import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { calculateAllUsersXP, calculateDailyXPGainForUser } from "@/lib/xp"

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

        const { searchParams } = new URL(req.url)
        const period = searchParams.get('period') || '30'

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

        // 2. Evolution of Max Series per day
        let dateLimit: Date | null = null;
        if (period !== 'all') {
            dateLimit = new Date()
            dateLimit.setDate(dateLimit.getDate() - parseInt(period))
        }

        const setsByDay = await prisma.exerciseSet.findMany({
            where: {
                userId: user.id,
                ...(dateLimit ? { createdAt: { gte: dateLimit } } : {})
            },
            orderBy: { createdAt: "asc" }
        })

        const maxSeriesHistory: Record<string, { PUSHUP: number, PULLUP: number, SQUAT: number }> = {}
        const hourlyDistribution: Record<number, number> = {}

        setsByDay.forEach(set => {
            // Max Series
            const date = set.date
            if (!maxSeriesHistory[date]) {
                maxSeriesHistory[date] = { PUSHUP: 0, PULLUP: 0, SQUAT: 0 }
            }
            const exercise = set.exercise as "PUSHUP" | "PULLUP" | "SQUAT"
            if (set.reps > maxSeriesHistory[date][exercise]) {
                maxSeriesHistory[date][exercise] = set.reps
            }

            // Hourly distribution
            const hour = new Date(set.createdAt).getHours()
            hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + set.reps
        })

        const maxSeriesData = Object.entries(maxSeriesHistory).map(([date, values]) => ({
            date,
            ...values
        })).sort((a, b) => a.date.localeCompare(b.date))

        // 3. XP Progression / Daily volume
        const dailyActivity: Record<string, { reps: number, badgesCount: number }> = {}

        setsByDay.forEach(set => {
            const date = set.date
            if (!dailyActivity[date]) dailyActivity[date] = { reps: 0, badgesCount: 0 }
            dailyActivity[date].reps += set.reps
        })

        user.badges.forEach(b => {
            const date = new Date(b.achievedAt).toISOString().split('T')[0]
            const isRecentEnough = !dateLimit || new Date(b.achievedAt) >= dateLimit
            if (isRecentEnough) {
                if (!dailyActivity[date]) dailyActivity[date] = { reps: 0, badgesCount: 0 }
                dailyActivity[date].badgesCount += 1
            }
        })

        const progressionData = Object.entries(dailyActivity).map(([date, val]) => ({
            date,
            reps: val.reps,
            badges: val.badgesCount
        })).sort((a, b) => a.date.localeCompare(b.date))

        // Hourly Array for frontend
        const hourlyData = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            reps: hourlyDistribution[i] || 0
        }))

        // 4. Yesterday's XP Recap
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayISO = yesterday.toISOString().split('T')[0];

        const { getUserSummaries } = require("@/lib/badges");
        const summaries = getUserSummaries(allUsers, []);
        const featuredConfig = await (prisma as any).globalConfig.findUnique({ where: { key: "featuredBadgeKey" } });
        const featuredBadgeKey = featuredConfig?.value;

        const realYesterdayRecap = calculateDailyXPGainForUser(
            user,
            yesterdayISO,
            summaries,
            allBadges,
            { maxVolDayUser: null, maxVolMonthUser: null, maxVolYearUser: null },
            featuredBadgeKey
        );

        return NextResponse.json({
            xpBreakdown: userXPInfo?.details || {},
            maxSeriesData,
            progressionData,
            hourlyData,
            totalXP: userXPInfo?.totalXP || 0,
            yesterdayRecap: realYesterdayRecap
        })
    } catch (error) {
        console.error("Analytics API Error:", error)
        return NextResponse.json({ message: "Erreur" }, { status: 500 })
    }
}
