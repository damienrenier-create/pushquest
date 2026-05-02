import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getDatesInRangeToToday, getDailyTargetForUserOnDate, formatDateISO } from "@/lib/challenge";
import { calculateLevel, calculateDailyXPGainForUser } from "@/lib/xp";
import { getUserSummaries } from "@/lib/badges";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const league = (session.user as any).league || "POMPES";

        // Fetch all users in league with all relevant data for XP/Level/Reps
        const users = await (prisma.user as any).findMany({
            where: {
                nickname: { not: 'modo' },
                league: league
            },
            select: {
                id: true,
                nickname: true,
                image: true,
                createdAt: true,
                sets: true,
                badges: true,
                xpAdjustments: true,
                buyoutPaid: true,
                buyoutPaidAt: true,
                medicalCertificates: true,
                onboardingStartedAt: true
            }
        });

        const badgeOwnerships = await (prisma as any).badgeOwnership.findMany({
            include: { badge: true }
        });

        const allEvents = await (prisma as any).badgeEvent.findMany({
            where: { eventType: { in: ["STEAL", "TORCH_CLAIM"] } }
        });

        // Precompute summaries for regularity XP and streaks
        const summaries = getUserSummaries(users, allEvents);

        // Find the overall start date
        const firstSet = await (prisma as any).set.findFirst({
            orderBy: { date: 'asc' },
            select: { date: true }
        });
        const startDate = firstSet?.date || "2026-01-01";
        const dates = getDatesInRangeToToday(startDate);

        // Precompute daily winners for XP bonus accuracy
        const dailyWinners = new Map<string, string>();
        dates.forEach(date => {
            let maxTotal = 0;
            let winnerId = null;
            users.forEach(u => {
                const total = (u.sets || []).filter((s: any) => s.date === date)
                    .reduce((sum: number, s: any) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps), 0);
                if (total > maxTotal) {
                    maxTotal = total;
                    winnerId = u.id;
                }
            });
            if (winnerId) dailyWinners.set(date, winnerId);
        });

        // Featured badge for XP bonus calculation
        const featuredConfig = await (prisma as any).globalConfig.findUnique({ where: { key: "featuredBadgeKey" } });
        const featuredBadgeKey = featuredConfig?.value;

        // Process data for each user
        const result = users.map(user => {
            let cumulativePushups = 0;
            let cumulativePullups = 0;
            let cumulativeSquats = 0;
            let cumulativePlanks = 0;
            let cumulativeXP = 0;

            const timeline = dates.map(date => {
                const daySets = (user.sets || []).filter((s: any) => s.date === date);
                
                const p = daySets.filter((s: any) => s.exercise === "PUSHUP").reduce((sum: number, s: any) => sum + s.reps, 0);
                const u = daySets.filter((s: any) => s.exercise === "PULLUP").reduce((sum: number, s: any) => sum + s.reps, 0);
                const s = daySets.filter((s: any) => s.exercise === "SQUAT").reduce((sum: number, s: any) => sum + s.reps, 0);
                const k = daySets.filter((s: any) => s.exercise === "PLANK").reduce((sum: number, s: any) => sum + s.reps, 0);

                cumulativePushups += p;
                cumulativePullups += u;
                cumulativeSquats += s;
                cumulativePlanks += k;

                // Daily XP Gain
                const dayXpBreakdown = calculateDailyXPGainForUser(
                    user,
                    date,
                    summaries,
                    badgeOwnerships,
                    { maxVolDayUser: dailyWinners.get(date) || null, maxVolMonthUser: null, maxVolYearUser: null },
                    featuredBadgeKey
                );

                cumulativeXP += (dayXpBreakdown?.total || 0);

                return {
                    date,
                    xp: cumulativeXP,
                    level: calculateLevel(cumulativeXP),
                    pushups: cumulativePushups,
                    pullups: cumulativePullups,
                    squats: cumulativeSquats,
                    planks: cumulativePlanks
                };
            });

            return {
                id: user.id,
                nickname: user.nickname,
                image: user.image,
                timeline
            };
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error("Progression API Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
