import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
    getTodayISO,
    formatDateISO,
    getDatesInRangeToToday,
    getRequiredRepsForDate,
    getDailyTargetForUserOnDate,
    getFineAmountForMonth,
    FINE_START_DATE,
    isLastDayOfMonth
} from "@/lib/challenge";
import { SPECIAL_DAYS } from "@/config/specialDays";
import { initBadges, getUserSummaries } from "@/lib/badges";
import { BADGE_DEFINITIONS } from "@/config/badges";
import { calculateAllUsersXP } from "@/lib/xp";
import { getXPForReward } from "@/lib/rewards";
import { getCompetitiveDangerList } from "@/lib/competitive-danger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const selectedDate = searchParams.get("date") || getTodayISO();
        const today = getTodayISO();
        const userId = session.user.id;
        const league = (session.user as any).league || "POMPES";

        // --- 0. Init Badges (Ensures DB matches config) ---
        await initBadges();

        // --- 1. Global Cleanup (A15) ---
        // Force-delete any unpaid fines before the new start date for ALL users
        try {
            await (prisma as any).fineRecord.deleteMany({
                where: {
                    date: { lt: FINE_START_DATE },
                    status: 'unpaid'
                }
            });
        } catch (e) {
            console.error("Cleanup Error:", e);
        }

        // --- 1. Fetch data for last 30 days (personal + group) ---
        const d30 = new Date();
        d30.setDate(d30.getDate() - 29);
        const startDate30 = formatDateISO(d30);

        const allUsers = (await (prisma.user as any).findMany({
            where: {
                nickname: { not: 'modo' },
                league: league
            },
            select: {
                id: true,
                nickname: true,
                email: true,
                image: true,
                buyoutPaid: true,
                buyoutPaidAt: true,
                sets: true,
                fines: true,
                sallyUps: true,
                medicalCertificates: true,
                potEvents: true,
                xpAdjustments: true,
                league: true,
                onboardingStartedAt: true,
                createdAt: true
            }
        })) as any[];

        // --- 2. Fetch events and compute summaries early (for streaks and fines) ---
        const allTorchAndStealEvents = await (prisma as any).badgeEvent.findMany({
            where: { eventType: { in: ["STEAL", "TORCH_CLAIM"] } }
        });
        const sharedSummaries = getUserSummaries(allUsers, allTorchAndStealEvents);

        // --- 3. Lazy Fine Calculation ---
        const fineDates = getDatesInRangeToToday(FINE_START_DATE).filter(d => d < today).slice(-7);

        for (const u of allUsers) {
            const summary = sharedSummaries.find(s => s.id === u.id);
            const uMaxSuccessStreak = summary?.maxSuccessStreak || 0;
            
            for (const d of fineDates) {
                const existingFine = u.fines?.find((f: any) => f.date === d);

                // --- Exemption Check ---
                let isExempt = false;

                // Onboarding exemption: no fines before 21 consecutive successful days
                if (u.onboardingStartedAt && uMaxSuccessStreak < 21) {
                    isExempt = true;
                }

                if (!isExempt && u.buyoutPaid && u.buyoutPaidAt) {
                    const buyoutDay = formatDateISO(new Date(u.buyoutPaidAt));
                    if (buyoutDay <= d) isExempt = true;
                }

                if (!isExempt) {
                    const hasCert = u.medicalCertificates?.some((c: any) => d >= c.startDateISO && d <= c.endDateISO);
                    if (hasCert) isExempt = true;
                }

                // If exempt but has a fine, delete it
                if (isExempt) {
                    if (existingFine && existingFine.status === 'unpaid') {
                        try {
                            await (prisma as any).fineRecord.delete({ where: { id: existingFine.id } });
                            u.fines = u.fines.filter((f: any) => f.id !== existingFine.id);
                        } catch (e) { }
                    }
                    continue;
                }

                const daySets = u.sets?.filter((s: any) => s.date === d) || [];
                const dayTotal = daySets
                    .reduce((sum: number, s: any) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps), 0);

                const req = getRequiredRepsForDate(d);

                if (existingFine) {
                    // If fine exists but requirement met, delete it
                    if (dayTotal >= req && existingFine.status === 'unpaid') {
                        try {
                            await (prisma as any).fineRecord.delete({ where: { id: existingFine.id } });
                            u.fines = u.fines.filter((f: any) => f.id !== existingFine.id);
                        } catch (e) { }
                    }
                } else {
                    // No fine exists, but requirement NOT met, create it
                    if (dayTotal < req) {
                        try {
                            const newFine = await (prisma as any).fineRecord.create({
                                data: {
                                    userId: u.id,
                                    date: d,
                                    amountEur: getFineAmountForMonth(d)
                                }
                            });
                            if (!u.fines) u.fines = [];
                            u.fines.push(newFine);
                        } catch (e) { }
                    }
                }
            }
        }


        // Re-fetch current user after fines (or just use local state if lazy)
        const currentUser = allUsers.find(u => u.id === userId) as any;

        const allSprinterEvents = (prisma as any).badgeEvent ? await (prisma as any).badgeEvent.findMany({
            where: { badgeKey: { startsWith: 'sprinter_' }, eventType: 'UNIQUE_AWARDED' }
        }) : [];

        // --- 3. Dashboard Aggregation ---

        const leaderboard = allUsers.map(u => {
            const uSets = u.sets || [];
            const totalPushupsAllTime = uSets.filter((s: any) => s.exercise === "PUSHUP").reduce((sum: number, s: any) => sum + s.reps, 0);
            const totalPullupsAllTime = uSets.filter((s: any) => s.exercise === "PULLUP").reduce((sum: number, s: any) => sum + s.reps, 0);
            const totalSquatsAllTime = uSets.filter((s: any) => s.exercise === "SQUAT").reduce((sum: number, s: any) => sum + s.reps, 0);
            const totalPlanksAllTime = uSets.filter((s: any) => s.exercise === "PLANK").reduce((sum: number, s: any) => sum + s.reps, 0);
            const totalRepsAllTime = totalPushupsAllTime + totalPullupsAllTime + totalSquatsAllTime + Math.floor(totalPlanksAllTime / 5);

            const isInjured = u.medicalCertificates?.some((c: any) => today >= c.startDateISO && today <= c.endDateISO);
            const currentMedicalNote = u.medicalCertificates?.find((c: any) => today >= c.startDateISO && today <= c.endDateISO)?.note || null;
            const isVeteran = u.buyoutPaid;

            const dates30 = getDatesInRangeToToday(startDate30).filter(d => d < today);
            let completeCount = 0;
            let currentStreak = 0;
            let totalPerfectDays = 0;
            const maxSingleSet = Math.max(0, ...uSets.map((s: any) => s.reps));
            let streakBroken = false;

            for (let i = dates30.length - 1; i >= 0; i--) {
                const d = dates30[i];
                const daySets = uSets.filter((s: any) => s.date === d);
                const dayTotal = daySets
                    .reduce((sum: number, s: any) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps), 0);

                const req = getDailyTargetForUserOnDate(u, d);

                // For rate/streak, injury or buyout counts as "completed" or "excused"
                const hasExcise = isVeteran || (u.medicalCertificates?.some((c: any) => d >= c.startDateISO && d <= c.endDateISO));
                const isComp = (dayTotal >= req) || hasExcise;

                if (isComp) {
                    completeCount++;
                    if (!hasExcise) totalPerfectDays++; // Excusé n'est pas "parfait" pour le badge
                    if (!streakBroken) currentStreak++;
                } else {
                    streakBroken = true;
                }
            }

            return {
                id: u.id,
                nickname: u.nickname,
                image: u.image,
                buyoutPaid: u.buyoutPaid,
                isInjured,
                isVeteran,
                currentMedicalNote,
                completionRate: (completeCount / Math.max(1, dates30.length)) * 100,
                streakCurrent: currentStreak,
                totalPerfectDays,
                maxSingleSet,
                totalPushupsAllTime,
                totalPullupsAllTime,
                totalSquatsAllTime,
                totalPlanksAllTime,
                totalRepsAllTime,
                maxSetPushups: Math.max(0, ...uSets.filter((s: any) => s.exercise === "PUSHUP").map((s: any) => s.reps)),
                sprinterCount: allSprinterEvents.filter((ev: any) => ev.toUserId === u.id).length,
                repsToday:
                    uSets.filter((s: any) => s.date === today && s.exercise !== "PLANK").reduce((sum: number, s: any) => sum + s.reps, 0) +
                    Math.floor(uSets.filter((s: any) => s.date === today && s.exercise === "PLANK").reduce((sum: number, s: any) => sum + s.reps, 0) / 5),
                finesDueEur: (u.fines || []).filter((f: any) => f.status === "unpaid").reduce((sum: number, f: any) => sum + f.amountEur, 0),
                finesPaidEur: (u.fines || []).filter((f: any) => f.status === "paid").reduce((sum: number, f: any) => sum + f.amountEur, 0),
                potEventsEur: (u.potEvents || []).reduce((sum: number, e: any) => sum + e.amountEur, 0),
                league: (u as any).league,
                sets: uSets
            };
        }).sort((a, b) => b.completionRate - a.completionRate || b.streakCurrent - a.streakCurrent || b.totalRepsAllTime - a.totalRepsAllTime);

        // Records (Enhanced Tie-break: Reps > User Total Exo > Date)
        const periods = [
            { id: "day", filter: (s: any) => s.date === today },
            { id: "week", filter: (s: any) => s.date >= formatDateISO(new Date(Date.now() - 6 * 86400000)) },
            { id: "month", filter: (s: any) => s.date.startsWith(today.substring(0, 7)) },
            { id: "year", filter: (s: any) => s.date.startsWith(today.substring(0, 4)) },
        ];
        const exTypes = ["PUSHUP", "PULLUP", "SQUAT", "PLANK"] as const;
        const recordsData: any = {};

        for (const p of periods) {
            recordsData[p.id] = { badge: p.id === "day" ? "🥉" : p.id === "week" ? "🥈" : p.id === "month" ? "🥇" : "💎" };
            for (const ex of exTypes) {
                const periodSets = leaderboard.flatMap(u => (u.sets || []).filter((s: any) => s.exercise === ex && p.filter(s)).map((s: any) => ({
                    ...s,
                    userId: u.id,
                    nickname: u.nickname,
                    userTotalEx: ex === "PUSHUP" ? u.totalPushupsAllTime : ex === "PULLUP" ? u.totalPullupsAllTime : ex === "SQUAT" ? u.totalSquatsAllTime : u.totalPlanksAllTime
                })));

                // Calcul du Volume Top 3
                const volumeMap = new Map<string, { nickname: string, totalVolume: number }>();
                periodSets.forEach((s: any) => {
                    const prev = volumeMap.get(s.userId) || { nickname: s.nickname, totalVolume: 0 };
                    volumeMap.set(s.userId, { nickname: s.nickname, totalVolume: prev.totalVolume + s.reps });
                });
                const top3Volume = Array.from(volumeMap.values()).sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 3);

                if (periodSets.length > 0) {
                    periodSets.sort((a: any, b: any) => b.reps - a.reps || b.userTotalEx - a.userTotalEx || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                    const uniqueSetsMap = new Map<string, any>();
                    periodSets.forEach((s: any) => {
                        if (!uniqueSetsMap.has(s.userId)) uniqueSetsMap.set(s.userId, s);
                    });
                    const top3Sets = Array.from(uniqueSetsMap.values()).slice(0, 3).map((s: any) => ({ winner: s.nickname, maxReps: s.reps }));

                    recordsData[p.id][ex.toLowerCase() + "s"] = {
                        winner: top3Sets[0]?.winner, maxReps: top3Sets[0]?.maxReps, top3Sets, top3Volume
                    };
                } else {
                    recordsData[p.id][ex.toLowerCase() + "s"] = { winner: "Pas de record", maxReps: 0, top3Sets: [], top3Volume: [] };
                }
            }
        }

        // Trophies Configuration (V3.1 Expansion)
        const milestonePaliers = [1000, 2000, 5000, 10000, 20000, 50000];
        const allTrophyBuckets = [
            ...milestonePaliers.map(p => ({ id: `pushups_${p}`, threshold: p, ex: "PUSHUP", label: `${p} Pompes`, emoji: p >= 10000 ? "💎" : "💪" })),
            ...milestonePaliers.map(p => ({ id: `pullups_${p}`, threshold: p, ex: "PULLUP", label: `${p} Tractions`, emoji: p >= 5000 ? "🦍" : "🧗" })),
            ...milestonePaliers.map(p => ({ id: `squats_${p}`, threshold: p, ex: "SQUAT", label: `${p} Squats`, emoji: p >= 10000 ? "🦾" : "🦵" })),
            ...milestonePaliers.map(p => ({ id: `planks_${p}`, threshold: p, ex: "PLANK", label: `${p}s Gainage`, emoji: "🛡️" })),
            { id: "streak_7", type: "streak", threshold: 7, label: "7j d'Assiduité", emoji: "🌱" },
            { id: "streak_30", type: "streak", threshold: 30, label: "30j d'Assiduité", emoji: "🔥" },
            { id: "streak_100", type: "streak", threshold: 100, label: "100j d'Assiduité", emoji: "👑" },
            { id: "perfect_10", type: "perfect", threshold: 10, label: "10 Jours Parfaits", emoji: "🎯" },
            { id: "flex_50", type: "flex", threshold: 50, label: "Flex (+50 bonus)", emoji: "🚀" },
            { id: "sprinter_1", type: "sprinter", threshold: 1, label: "Sprinteur 1j", emoji: "⚡" },
            { id: "sprinter_5", type: "sprinter", threshold: 5, label: "Sprinteur 5j", emoji: "🏎️" },
            { id: "sprinter_10", type: "sprinter", threshold: 10, label: "Sprinteur 10j", emoji: "🐆" },
            { id: "sprinter_30", type: "sprinter", threshold: 30, label: "Sprinteur 30j", emoji: "🛸" },
            { id: "sprinter_50", type: "sprinter", threshold: 50, label: "Sprinteur 50j", emoji: "🚀" },
            { id: "sprinter_100", type: "sprinter", threshold: 100, label: "Sprinteur 100j", emoji: "🌌" }
        ];

        const currentUserLB = leaderboard.find(u => u.id === userId);
        const earnedTrophies: any[] = [];
        const availableTrophies: any[] = [];

        for (const t of allTrophyBuckets) {
            const earnedBy: string[] = [];
            leaderboard.forEach(u => {
                let hasIt = false;
                const trophy = t as any;
                if (trophy.ex) {
                    const total = trophy.ex === "PUSHUP" ? u.totalPushupsAllTime : trophy.ex === "PULLUP" ? u.totalPullupsAllTime : trophy.ex === "PLANK" ? u.totalPlanksAllTime : u.totalSquatsAllTime;
                    if (total >= t.threshold) hasIt = true;
                } else if (trophy.type === "streak") {
                    if (u.streakCurrent >= t.threshold) hasIt = true;
                } else if (trophy.type === "perfect") {
                    if (u.totalPerfectDays >= t.threshold) hasIt = true;
                } else if (trophy.type === "flex") {
                    const hasFlex = (u.sets || []).some((s: any) => {
                        const dayTotal = (u.sets || []).filter((ss: any) => ss.date === s.date)
                            .reduce((sum: number, ss: any) => sum + (ss.exercise === "PLANK" ? Math.floor(ss.reps / 5) : ss.reps), 0);
                        return dayTotal >= (getRequiredRepsForDate(s.date) + 50);
                    });
                    if (hasFlex) hasIt = true;
                } else if (trophy.type === "sprinter") {
                    if (u.sprinterCount >= t.threshold) hasIt = true;
                }

                if (hasIt) earnedBy.push(u.nickname);
            });

            if (earnedBy.length > 0) earnedTrophies.push({ ...t, winners: earnedBy });
            else availableTrophies.push(t);
        }

        // Special Days 2026 Logic
        const earnedSpecialDays: any[] = [];
        let availableSpecialDays: any[] = [];
        Object.entries(SPECIAL_DAYS).forEach(([date, info]) => {
            const winners = leaderboard.filter(u => {
                const dayTotal = (u.sets || []).filter((s: any) => s.date === date)
                    .reduce((sum: number, s: any) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps), 0);
                return dayTotal >= getRequiredRepsForDate(date);
            }).map(u => u.nickname);

            if (winners.length > 0) earnedSpecialDays.push({ date, ...info, winners });
            else if (date >= today) availableSpecialDays.push({ date, ...info });
        });

        // Limit to next 3 events
        availableSpecialDays = availableSpecialDays.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);

        // Cagnotte Rewards Suggestions
        const potEur = leaderboard.reduce((sum, u) => sum + u.finesDueEur + u.finesPaidEur + (u.potEventsEur || 0), 0);
        const rewardsTiers = [
            { min: 0, label: "Encore un effort 😄" },
            { min: 2, label: "Un pain au chocolat" },
            { min: 5, label: "Un paquet de chips" },
            { min: 10, label: "Une tournée de softs" },
            { min: 20, label: "Un apéro sympa" },
            { min: 50, label: "Un gros apéro" },
            { min: 100, label: "Un resto simple" },
            { min: 200, label: "10 Pizzas !" },
            { min: 500, label: "Gros resto + boissons" },
            { min: 1000, label: "Un week-end en groupe" },
            { min: 2000, label: "Gros événement" },
            { min: 5000, label: "Week-end luxe" },
            { min: 10000, label: "Voyage de groupe ✈️" },
        ];
        const currentReward = [...rewardsTiers].reverse().find(r => potEur >= r.min) || rewardsTiers[0];
        const nextReward = rewardsTiers.find(r => r.min > potEur);

        // Graphs (Simplified)
        const myDaily30 = getDatesInRangeToToday(startDate30).map(date => {
            const daySets = (currentUserLB?.sets || []).filter((s: any) => s.date === date);
            return {
                date,
                pushups: daySets.filter((s: any) => s.exercise === "PUSHUP").reduce((sum: number, s: any) => (sum || 0) + (s.reps || 0), 0),
                pullups: daySets.filter((s: any) => s.exercise === "PULLUP").reduce((sum: number, s: any) => (sum || 0) + (s.reps || 0), 0),
                squats: daySets.filter((s: any) => s.exercise === "SQUAT").reduce((sum: number, s: any) => (sum || 0) + (s.reps || 0), 0),
                total: daySets.reduce((sum: number, s: any) => (sum || 0) + (s.reps || 0), 0)
            };
        });

        const startDate365 = new Date(today);
        startDate365.setDate(startDate365.getDate() - 365);
        const myDaily365 = getDatesInRangeToToday(formatDateISO(startDate365)).map(date => {
            const daySets = (currentUserLB?.sets || []).filter((s: any) => s.date === date);
            return {
                date,
                pushups: daySets.filter((s: any) => s.exercise === "PUSHUP").reduce((sum: number, s: any) => (sum || 0) + (s.reps || 0), 0),
                pullups: daySets.filter((s: any) => s.exercise === "PULLUP").reduce((sum: number, s: any) => (sum || 0) + (s.reps || 0), 0),
                squats: daySets.filter((s: any) => s.exercise === "SQUAT").reduce((sum: number, s: any) => (sum || 0) + (s.reps || 0), 0),
                total: daySets.reduce((sum: number, s: any) => (sum || 0) + (s.reps || 0), 0)
            };
        });

        // --- 4. Badge Competition Data ---
        const badgeOwnerships = await (prisma as any).badgeOwnership.findMany({
            include: {
                badge: true,
                currentUser: { select: { nickname: true, image: true } }
            }
        });

        // summaries already computed above


        // Calcul des XP (Leaderboard XP V3)
        const xpScores = await calculateAllUsersXP(allUsers, badgeOwnerships, sharedSummaries);
        const currentUserXP = xpScores.find(x => x.id === userId);

        // --- 4. Onboarding December Bonus ---
        if (today >= "2026-12-01") {
            const minXP = xpScores.length > 0 ? xpScores[xpScores.length - 1].totalXP : 0;
            for (const u of allUsers) {
                if (u.onboardingStartedAt) {
                    const userXP = xpScores.find(x => x.id === u.id)?.totalXP || 0;
                    if (userXP > minXP) {
                        const hasBonus = u.xpAdjustments?.some((a: any) => a.reason === "ONBOARDING_DECEMBER_BONUS");
                        if (!hasBonus) {
                            try {
                                await (prisma as any).xpAdjustment.create({
                                    data: {
                                        userId: u.id,
                                        amount: 10000,
                                        reason: "ONBOARDING_DECEMBER_BONUS",
                                        date: today
                                    }
                                });
                            } catch (e) { }
                        }
                    }
                }
            }
        }


        const recentEvents = (await (prisma as any).badgeEvent.findMany({
            take: 30,
            orderBy: { createdAt: "desc" },
            include: {
                badge: true,
                fromUser: { select: { nickname: true, image: true } },
                toUser: { select: { nickname: true, image: true } },
                likes: { select: { userId: true } }
            }
        }))?.filter((ev: any) => ev.fromUserId !== ev.toUserId) || [];

        // Logic for "Badges in Danger" — uses shared helper (same as Pantheon)
        const dangerList = getCompetitiveDangerList({
            badgeOwnerships,
            summaries: sharedSummaries,
            allEvents: recentEvents,
            getXPForReward,
        }).slice(0, 5); // Dashboard shows max 5

        // --- Hourly Distribution (Pic d'activité) ---
        const hourlyDistribution: Record<number, number> = {};
        (currentUser.sets || []).forEach((set: any) => {
            if (!set.createdAt) return;
            const d = new Date(set.createdAt);
            if (isNaN(d.getTime())) return;
            const hour = d.getHours();
            hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + (set.reps || 0);
        });

        const hourlyData = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            reps: hourlyDistribution[i] || 0
        }));

        return NextResponse.json({
            todayISO: today,
            selectedDateISO: selectedDate,
            requiredReps: {
                selected: getDailyTargetForUserOnDate(currentUser, selectedDate),
                today: getDailyTargetForUserOnDate(currentUser, today)
            },
            setsSelected: {
                pushups: (currentUserLB?.sets || []).filter((s: any) => s.date === selectedDate && s.exercise === "PUSHUP").map((s: any) => s.reps),
                pullups: (currentUserLB?.sets || []).filter((s: any) => s.date === selectedDate && s.exercise === "PULLUP").map((s: any) => s.reps),
                squats: (currentUserLB?.sets || []).filter((s: any) => s.date === selectedDate && s.exercise === "SQUAT").map((s: any) => s.reps),
                planks: (currentUserLB?.sets || []).filter((s: any) => s.date === selectedDate && s.exercise === "PLANK").map((s: any) => s.reps),
            },
            totalsSelected: {
                pushups: (currentUserLB?.sets || []).filter((s: any) => s.date === selectedDate && s.exercise === "PUSHUP").reduce((sum: number, s: any) => sum + s.reps, 0),
                pullups: (currentUserLB?.sets || []).filter((s: any) => s.date === selectedDate && s.exercise === "PULLUP").reduce((sum: number, s: any) => sum + s.reps, 0),
                squats: (currentUserLB?.sets || []).filter((s: any) => s.date === selectedDate && s.exercise === "SQUAT").reduce((sum: number, s: any) => sum + s.reps, 0),
                planks: (currentUserLB?.sets || []).filter((s: any) => s.date === selectedDate && s.exercise === "PLANK").reduce((sum: number, s: any) => sum + s.reps, 0),
                total: (currentUserLB?.sets || []).filter((s: any) => s.date === selectedDate)
                    .reduce((sum: number, s: any) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps), 0)
            },

            leaderboard: leaderboard.map(({ sets, ...rest }) => rest),
            records: recordsData,
            xp: {
                leaderboard: xpScores,
                currentUser: currentUserXP
            },
            badges: {
                earned: { trophies: earnedTrophies, specialDays: earnedSpecialDays },
                available: { trophies: availableTrophies, specialDays: availableSpecialDays },
                competitive: {
                    ownerships: badgeOwnerships,
                    events: recentEvents,
                    danger: dangerList
                }
            },
            cagnotte: {
                enabled: today >= FINE_START_DATE,
                potEur,
                currentReward,
                nextReward,
                finesList: leaderboard.filter(u => u.finesDueEur > 0).map(u => ({ nickname: u.nickname, amount: u.finesDueEur }))
            },
            sallyUp: {
                enabledForSelectedDate: isLastDayOfMonth(selectedDate),
                selectedDateReps: (allUsers.find(u => u.id === userId)?.sallyUps || []).find((s: any) => s.date === selectedDate)?.seconds || 0,
                monthPodium: allUsers.flatMap(u => (u.sallyUps || []).filter((s: any) => s.date.startsWith(today.substring(0, 7))).map((s: any) => ({
                    nickname: u.nickname,
                    reps: s.seconds,
                    totalPushupsAllTime: (u.sets || []).filter((ss: any) => ss.exercise === "PUSHUP").reduce((sum: number, ss: any) => sum + ss.reps, 0),
                    totalPlanksAllTime: (u.sets || []).filter((ss: any) => ss.exercise === "PLANK").reduce((sum: number, ss: any) => sum + ss.reps, 0),
                    createdAt: s.createdAt
                }))).sort((a: any, b: any) => {
                    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    return b.reps - a.reps || b.totalPushupsAllTime - a.totalPushupsAllTime || aTime - bTime;
                }).slice(0, 3)
            },
            graphs: {
                myDaily: myDaily30,
                myDaily365: myDaily365
            },
            hourlyData
        });

    } catch (error) {
        console.error("Dashboard V3 Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
