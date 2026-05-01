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
            if (!b.achievedAt) return;
            const dObj = new Date(b.achievedAt);
            if (isNaN(dObj.getTime())) return;
            
            const date = dObj.toISOString().split('T')[0];
            const isRecentEnough = !dateLimit || dObj >= dateLimit;
            if (isRecentEnough) {
                if (!dailyActivity[date]) dailyActivity[date] = { reps: 0, badgesCount: 0 };
                dailyActivity[date].badgesCount += 1;
            }
        });

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

        // 4. Combat Reports (Last 7 days + Top 3 Ever)
        const allEvents = await prisma.badgeEvent.findMany({
            where: { eventType: { in: ["STEAL", "TORCH_CLAIM"] } }
        });
        const { getUserSummaries } = require("@/lib/badges");
        const summaries = getUserSummaries(allUsers, allEvents);
        const featuredConfig = await (prisma as any).globalConfig.findUnique({ where: { key: "featuredBadgeKey" } });
        const featuredBadgeKey = featuredConfig?.value;

        // Last 7 days
        const last7DaysRecaps = [];
        for (let i = 1; i <= 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dISO = d.toISOString().split('T')[0];
            const recap = calculateDailyXPGainForUser(
                user,
                dISO,
                summaries,
                allBadges,
                { maxVolDayUser: null, maxVolMonthUser: null, maxVolYearUser: null },
                featuredBadgeKey
            );
            if (recap && (recap.total || 0) > 0) {
                last7DaysRecaps.push({ date: dISO, ...recap });
            }
        }

        // Top 3 Ever
        // Get all unique dates for this user
        const allUserDates = Array.from(new Set(user.sets.map((s: any) => s.date))).sort().reverse();
        const allTimeRecaps = allUserDates.map(dISO => {
            const recap = calculateDailyXPGainForUser(
                user,
                dISO,
                summaries,
                allBadges,
                { maxVolDayUser: null, maxVolMonthUser: null, maxVolYearUser: null },
                featuredBadgeKey
            );
            return { date: dISO, ...recap };
        }).filter(r => (r.total || 0) > 0).sort((a, b) => (b.total || 0) - (a.total || 0));

        const top3Recaps = allTimeRecaps.slice(0, 3);

        return NextResponse.json({
            xpBreakdown: userXPInfo?.details || {},
            maxSeriesData,
            progressionData,
            hourlyData,
            totalXP: userXPInfo?.totalXP || 0,
            yesterdayRecap: last7DaysRecaps[0] || null,
            weeklyRecaps: last7DaysRecaps,
            topRecaps: top3Recaps
        })
    } catch (error) {
        console.error("Analytics API Error:", error)
        return NextResponse.json({ message: "Erreur" }, { status: 500 })
    }
}
