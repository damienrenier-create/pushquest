import prisma from "./prisma";
import { getRequiredRepsForDate, getTodayISO, isLastDayOfMonth, getYesterdayISO } from "./challenge";

import { BADGE_DEFINITIONS } from "@/config/badges";

export async function initBadges() {
    for (const def of BADGE_DEFINITIONS) {
        const { type, condition, rarity, addedAt, ...dbDef } = def as any;
        await (prisma as any).badgeDefinition.upsert({
            where: { key: dbDef.key },
            update: { ...dbDef },
            create: { ...dbDef },
        });
        await (prisma as any).badgeOwnership.upsert({
            where: { badgeKey: dbDef.key },
            update: {},
            create: { badgeKey: dbDef.key },
        });
    }
}

export function getUserSummaries(allUsers: any[], allEvents: any[]) {
    // 1. Pre-process sprinter stats more efficiently
    const sprinterCounts: Record<string, number> = {};
    const winnersByDate: Record<string, string> = {};
    allUsers.forEach(u => sprinterCounts[u.id] = 0);

    // Group sets by date for global processing
    const setsByDate: Record<string, any[]> = {};
    allUsers.forEach(u => {
        (u.sets || []).forEach((s: any) => {
            if (!setsByDate[s.date]) setsByDate[s.date] = [];
            setsByDate[s.date].push({ ...s, userId: u.id });
        });
    });

    Object.entries(setsByDate).forEach(([date, daySets]) => {
        const req = getRequiredRepsForDate(date);
        if (req <= 0) return;

        // Sort day sets once by creation time
        daySets.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        const userProgress: Record<string, number> = {};
        for (const s of daySets) {
            userProgress[s.userId] = (userProgress[s.userId] || 0) + s.reps;
            if (userProgress[s.userId] >= req) {
                sprinterCounts[s.userId]++;
                winnersByDate[date] = s.userId;
                break; // Day winner found
            }
        }
    });

    // 2. Process each user's summaries
    const stealEventsByToUser: Record<string, any[]> = {};
    allEvents.forEach(e => {
        if (!stealEventsByToUser[e.toUserId]) stealEventsByToUser[e.toUserId] = [];
        stealEventsByToUser[e.toUserId].push(e);
    });

    const sortedWinningDates = Object.keys(winnersByDate).sort();

    return allUsers.map((u: any) => {
        const sets = u.sets || [];
        const days = Array.from(new Set(sets.map((s: any) => s.date))).sort() as string[];
        const finesByDate: Record<string, any[]> = {};
        (u.fines || []).forEach((f: any) => {
            if (!finesByDate[f.date]) finesByDate[f.date] = [];
            finesByDate[f.date].push(f);
        });

        // Statistics to compute in a single pass over days/sets
        let maxBonus = 0;
        let maxBonusStreak = 0;
        let currentBonusStreak = 0;
        let maxPerfectStreak = 0;
        let currentPerfectStreak = 0;
        let maxMonoExoStreak = 0;
        let currentMonoExoStreak = 0;
        let maxTriExoStreak = 0;
        let currentTriExoStreak = 0;

        let totalPushups = 0;
        let totalPullups = 0;
        let totalSquats = 0;
        let totalPlanks = 0;
        let maxSetPushups = 0;
        let maxSetPullups = 0;
        let maxSetSquats = 0;
        let maxSetPlanks = 0;
        let maxSetAll = 0;

        const setsByExoTarget: Record<string, number> = {};

        let earlyStreakMax = 0;
        let earlyStreakCur = 0;
        let lateStreakMax = 0;
        let lateStreakCur = 0;
        let noonStreakMax = 0;
        let noonStreakCur = 0;
        let fineFreeStreakMax = 0;
        let fineFreeStreakCur = 0;

        let maxTorchStreak = 0;
        let currentTorchStreak = 0;
        let lastWinDate: Date | null = null;

        sortedWinningDates.forEach(dateStr => {
            if (winnersByDate[dateStr] === u.id) {
                const dateObj = new Date(dateStr);
                if (lastWinDate) {
                    const diffDays = Math.round((dateObj.getTime() - lastWinDate.getTime()) / (1000 * 3600 * 24));
                    if (diffDays === 1) currentTorchStreak++;
                    else currentTorchStreak = 1;
                } else {
                    currentTorchStreak = 1;
                }
                lastWinDate = dateObj;
                if (currentTorchStreak > maxTorchStreak) maxTorchStreak = currentTorchStreak;
            } else {
                currentTorchStreak = 0;
                lastWinDate = null;
            }
        });

        let maxDayPushups = 0;
        let maxDaySquats = 0;
        let maxDayAll = 0;
        let maxWeekPushups = 0;
        let maxWeekSquats = 0;
        let maxWeekAll = 0;

        const datePlayedMap: Record<string, boolean> = {};

        days.forEach((d: string) => {
            const daySets = sets.filter((s: any) => s.date === d);
            const req = getRequiredRepsForDate(d);
            let dayTotal = 0;
            let dayPushups = 0;
            let dayPullups = 0;
            let daySquats = 0;
            let dayPlanks = 0;
            let hasEarly = false;
            let hasLate = false;
            let hasNoon = false;

            datePlayedMap[d] = true;

            daySets.forEach((s: any) => {
                dayTotal += s.reps;
                if (s.reps > maxSetAll) maxSetAll = s.reps;

                const key = `${s.exercise}_${s.reps}`;
                setsByExoTarget[key] = (setsByExoTarget[key] || 0) + 1;

                const hour = new Date(s.createdAt).getHours();
                const minutes = new Date(s.createdAt).getMinutes();
                if (hour < 6) hasEarly = true;
                if (hour >= 22) hasLate = true;
                if (hour === 12 && minutes === 0) hasNoon = true;

                if (s.exercise === "PUSHUP") {
                    dayPushups += s.reps;
                    totalPushups += s.reps;
                    if (s.reps > maxSetPushups) maxSetPushups = s.reps;
                    dayTotal += s.reps;
                } else if (s.exercise === "PULLUP") {
                    dayPullups += s.reps;
                    totalPullups += s.reps;
                    if (s.reps > maxSetPullups) maxSetPullups = s.reps;
                    dayTotal += s.reps;
                } else if (s.exercise === "SQUAT") {
                    daySquats += s.reps;
                    totalSquats += s.reps;
                    if (s.reps > maxSetSquats) maxSetSquats = s.reps;
                    dayTotal += s.reps;
                } else if (s.exercise === "PLANK") {
                    dayPlanks += s.reps;
                    totalPlanks += s.reps;
                    if (s.reps > maxSetPlanks) maxSetPlanks = s.reps;
                    dayTotal += Math.floor(s.reps / 5);
                }

                if (s.reps > maxSetAll && s.exercise !== "PLANK") maxSetAll = s.reps;
            });

            if (dayPushups > maxDayPushups) maxDayPushups = dayPushups;
            if (daySquats > maxDaySquats) maxDaySquats = daySquats;
            if (dayTotal > maxDayAll) maxDayAll = dayTotal;

            // Streaks
            const bonus = dayTotal - req;
            if (bonus > 0) {
                currentBonusStreak++;
                if (bonus > maxBonus) maxBonus = bonus;
            } else { currentBonusStreak = 0; }
            if (currentBonusStreak > maxBonusStreak) maxBonusStreak = currentBonusStreak;

            if (dayTotal === req && req > 0) {
                currentPerfectStreak++;
            } else { currentPerfectStreak = 0; }
            if (currentPerfectStreak > maxPerfectStreak) maxPerfectStreak = currentPerfectStreak;

            let activeExos = 0;
            if (dayPushups > 0) activeExos++;
            if (dayPullups > 0) activeExos++;
            if (daySquats > 0) activeExos++;
            if (dayPlanks > 0) activeExos++;

            if (activeExos === 1) {
                currentMonoExoStreak++;
            } else { currentMonoExoStreak = 0; }
            if (currentMonoExoStreak > maxMonoExoStreak) maxMonoExoStreak = currentMonoExoStreak;

            if (dayTotal > 0 && dayPushups >= 0.3 * dayTotal && dayPullups >= 0.3 * dayTotal && daySquats >= 0.3 * dayTotal) {
                currentTriExoStreak++;
            } else { currentTriExoStreak = 0; }
            if (currentTriExoStreak > maxTriExoStreak) maxTriExoStreak = currentTriExoStreak;

            // Time streaks
            if (hasEarly) earlyStreakCur++; else earlyStreakCur = 0;
            earlyStreakMax = Math.max(earlyStreakMax, earlyStreakCur);
            if (hasLate) lateStreakCur++; else lateStreakCur = 0;
            lateStreakMax = Math.max(lateStreakMax, lateStreakCur);
            if (hasNoon) noonStreakCur++; else noonStreakCur = 0;
            noonStreakMax = Math.max(noonStreakMax, noonStreakCur);

            // Fine free streak
            if (!finesByDate[d] || finesByDate[d].length === 0) fineFreeStreakCur++; else fineFreeStreakCur = 0;
            fineFreeStreakMax = Math.max(fineFreeStreakMax, fineFreeStreakCur);

            // Weekly rolling volume
            const currentDate = new Date(d);
            const weekBack = new Date(currentDate);
            weekBack.setDate(weekBack.getDate() - 6);
            const weekBackISO = weekBack.toISOString().split('T')[0];

            const weekSets = sets.filter((s: any) => s.date >= weekBackISO && s.date <= d);
            const weekPushups = weekSets.filter((s: any) => s.exercise === "PUSHUP").reduce((sum: number, s: any) => sum + s.reps, 0);
            const weekSquats = weekSets.filter((s: any) => s.exercise === "SQUAT").reduce((sum: number, s: any) => sum + s.reps, 0);
            const weekAll = weekSets.reduce((sum: number, s: any) => sum + s.reps, 0);

            if (weekPushups > maxWeekPushups) maxWeekPushups = weekPushups;
            if (weekSquats > maxWeekSquats) maxWeekSquats = weekSquats;
            if (weekAll > maxWeekAll) maxWeekAll = weekAll;
        });

        // Post-processing
        const stealCount = stealEventsByToUser[u.id]?.length || 0;
        const paidFines = (u.fines || []).filter((f: any) => f.status === 'paid');
        const totalFinesAmount = paidFines.reduce((sum: number, f: any) => sum + (f.amountEur || 2), 0);

        let balanceRatio = 0;
        if (totalPushups + totalSquats >= 500 && totalPushups > 0 && totalSquats > 0) {
            balanceRatio = Math.floor((Math.min(totalPushups, totalSquats) / Math.max(totalPushups, totalSquats)) * 100);
        }

        return {
            id: u.id,
            nickname: u.nickname,
            maxBonus,
            maxBonusStreak,
            maxPerfectStreak,
            stealCount,
            maxMonoExoStreak,
            maxTriExoStreak,
            balanceRatio,
            maxSetPushups,
            maxSetPullups,
            maxSetSquats,
            maxSetPlanks,
            maxSetAll,
            totalFinesAmount,
            totalPushups,
            totalPullups,
            totalSquats,
            totalPlanks,
            totalAll: totalPushups + totalPullups + totalSquats + Math.floor(totalPlanks / 5),
            setsByTarget: (exo: string, target: number) => setsByExoTarget[`${exo}_${target}`] || 0,
            earlyStreak: earlyStreakMax,
            lateStreak: lateStreakMax,
            noonStreak: noonStreakMax,
            checkDatePlayed: (dateStr: string) => {
                if (!dateStr) return false;
                const target = dateStr.startsWith('-') ? "2026" + dateStr : dateStr;
                return !!datePlayedMap[target];
            },
            hasStPatrickGold: () => {
                const target = "2026-03-17";
                const daySets = sets.filter((s: any) => s.date === target);
                const total = daySets.reduce((sum: number, s: any) => sum + s.reps, 0);
                return total >= getRequiredRepsForDate(target);
            },
            getMarvinReps: () => {
                const target = "2026-03-08";
                const daySets = sets.filter((s: any) => s.date === target);
                return daySets.reduce((sum: number, s: any) => sum + s.reps, 0);
            },
            hasStDamien: sets.some((s: any) => s.date.endsWith("-12-18")),
            hasStNicolas: sets.some((s: any) => s.date.endsWith("-12-06")),
            fineFreeStreak: fineFreeStreakMax,
            maxTorchStreak,
            sprinterCount: sprinterCounts[u.id] || 0,
            headhunterCount: u.featuredClaimsCount || 0,
            getDayTotal: (date: string) => sets.filter((s: any) => s.date === date).reduce((sum: number, s: any) => sum + (s.exercise === 'PLANK' ? Math.floor(s.reps / 5) : s.reps), 0),
            getDayMaxSet: (date: string, exo?: string) => {
                const daySets = sets.filter((s: any) => s.date === date && (!exo || s.exercise === exo));
                return daySets.length ? Math.max(...daySets.map((s: any) => s.reps)) : 0;
            },
            getMonthTotal: (monthISO: string, exo?: string) => sets.filter((s: any) => s.date.startsWith(monthISO) && (!exo || s.exercise === exo)).reduce((sum: number, s: any) => sum + s.reps, 0),
            getMonthMaxSet: (monthISO: string, exo?: string) => {
                const monthSets = sets.filter((s: any) => s.date.startsWith(monthISO) && (!exo || s.exercise === exo));
                return monthSets.length ? Math.max(...monthSets.map((s: any) => s.reps)) : 0;
            },
            hasTrinityGold: (dateISO: string) => {
                const daySets = sets.filter((s: any) => s.date === dateISO);
                const total = daySets.reduce((sum: number, s: any) => sum + s.reps, 0);
                const req = getRequiredRepsForDate(dateISO);
                const hasEach = ["PUSHUP", "PULLUP", "SQUAT"].every(exo => daySets.some((s: any) => s.exercise === exo));
                return total >= 3 * req && req > 0 && hasEach;
            },
            hasTrinityUltimate: (dateISO: string) => {
                const daySets = sets.filter((s: any) => s.date === dateISO);
                const req = getRequiredRepsForDate(dateISO);
                return ["PUSHUP", "PULLUP", "SQUAT"].every(exo => {
                    const exoTotal = daySets.filter((s: any) => s.exercise === exo).reduce((sum: number, s: any) => sum + s.reps, 0);
                    return exoTotal >= req;
                }) && req > 0;
            },
            hasQuatuorStreak: (dateISO: string) => {
                const daySets = sets.filter((s: any) => s.date === dateISO);
                const dayPushups = daySets.filter((s: any) => s.exercise === "PUSHUP").reduce((sum: number, s: any) => sum + s.reps, 0);
                const dayPullups = daySets.filter((s: any) => s.exercise === "PULLUP").reduce((sum: number, s: any) => sum + s.reps, 0);
                const daySquats = daySets.filter((s: any) => s.exercise === "SQUAT").reduce((sum: number, s: any) => sum + s.reps, 0);
                const dayPlanks = daySets.filter((s: any) => s.exercise === "PLANK").reduce((sum: number, s: any) => sum + Math.floor(s.reps / 5), 0);
                const dayTotal = dayPushups + dayPullups + daySquats + dayPlanks;
                return dayTotal > 0 && dayPushups >= 0.25 * dayTotal && dayPullups >= 0.25 * dayTotal && daySquats >= 0.25 * dayTotal && dayPlanks >= 0.25 * dayTotal;
            },
            hasQuatuorGold: (dateISO: string) => {
                const daySets = sets.filter((s: any) => s.date === dateISO);
                const total = daySets.reduce((sum: number, s: any) => sum + (s.exercise === 'PLANK' ? Math.floor(s.reps / 5) : s.reps), 0);
                const req = getRequiredRepsForDate(dateISO);
                const hasEach = ["PUSHUP", "PULLUP", "SQUAT", "PLANK"].every(exo => daySets.some((s: any) => s.exercise === exo));
                return total >= 4 * req && req > 0 && hasEach;
            },
            hasQuatuorUltimate: (dateISO: string) => {
                const daySets = sets.filter((s: any) => s.date === dateISO);
                const req = getRequiredRepsForDate(dateISO);
                return ["PUSHUP", "PULLUP", "SQUAT", "PLANK"].every(exo => {
                    const exoTotal = daySets.filter((s: any) => s.exercise === exo).reduce((sum: number, s: any) => sum + (exo === 'PLANK' ? Math.floor(s.reps / 5) : s.reps), 0);
                    return exoTotal >= req;
                }) && req > 0;
            },
            getDaySum: (date: string, exo: string) => sets.filter((s: any) => s.date === date && s.exercise === exo).reduce((sum: number, s: any) => sum + s.reps, 0),
            getScaleReps: (date: string) => Array.from(new Set(sets.filter((s: any) => s.date === date).map((s: any) => s.reps))) as number[],
            getScaleRepsByExo: (date: string, exo: string) => Array.from(new Set(sets.filter((s: any) => s.date === date && s.exercise === exo).map((s: any) => s.reps))) as number[],
            getHistoricalMaxVolume: (days: number, exo?: string) => {
                if (days === 1) {
                    if (exo === "PUSHUP") return maxDayPushups;
                    if (exo === "SQUAT") return maxDaySquats;
                    return maxDayAll;
                }
                if (days === 7) {
                    if (exo === "PUSHUP") return maxWeekPushups;
                    if (exo === "SQUAT") return maxWeekSquats;
                    return maxWeekAll;
                }
                return 0;
            },
            hasEquinoxRatio: (dateISO: string) => {
                const daySets = sets.filter((s: any) => s.date === dateISO);
                const dayPushups = daySets.filter((s: any) => s.exercise === "PUSHUP").reduce((sum: number, s: any) => sum + s.reps, 0);
                const daySquats = daySets.filter((s: any) => s.exercise === "SQUAT").reduce((sum: number, s: any) => sum + s.reps, 0);
                const dayTotal = dayPushups + daySquats;
                return dayTotal >= 50 && dayPushups === daySquats;
            },
            hasChristmasSapin: (dateISO: string) => {
                const daySets = sets.filter((s: any) => s.date === dateISO);
                return ["PUSHUP", "PULLUP", "SQUAT"].every(exo => {
                    const exoSets = daySets.filter((s: any) => s.exercise === exo).map((s: any) => s.reps);
                    // Check if they did exactly one of each from 1 to 15? or just that they hit the target?
                    // The description says "Série Sapin (1 à 15 sur CHAQUE exo)". 
                    // Let's assume it means they have sets of 1, 2, 3... 15.
                    for (let i = 1; i <= 15; i++) {
                        if (!exoSets.includes(i)) return false;
                    }
                    return true;
                });
            },
            hasSaintNicolasSix: (dateISO: string) => {
                const dayTotal = sets.filter((s: any) => s.date === dateISO).reduce((sum: number, s: any) => sum + s.reps, 0);
                return dayTotal > 0 && dayTotal % 10 === 6;
            },
            hasSolsticeWinter: (dateISO: string) => {
                const daySets = sets.filter((s: any) => s.date === dateISO);
                const activeHours = new Set(daySets.map((s: any) => {
                    const date = new Date(s.createdAt);
                    return date.getHours();
                }));

                if (activeHours.size < 12) return false;

                const sortedHours = Array.from(activeHours).sort((a: any, b: any) => (a as number) - (b as number));
                let maxStreak = 0;
                let currentStreak = 0;
                let lastHour = -2;

                for (const h of sortedHours) {
                    if ((h as number) === lastHour + 1) {
                        currentStreak++;
                    } else {
                        currentStreak = 1;
                    }
                    maxStreak = Math.max(maxStreak, currentStreak);
                    lastHour = h as number;
                }
                return maxStreak >= 12;
            },
            hasSallyUpParticipation: (dateISO: string) => {
                const sUps = u.sallyUps || [];
                return sUps.some((s: any) => s.date === dateISO && s.seconds > 0);
            },
            getSallyUpSeconds: (dateISO: string) => {
                const sUps = u.sallyUps || [];
                const record = sUps.find((s: any) => s.date === dateISO);
                return record ? record.seconds : 0;
            }
        };
    });
}

export async function updateBadgesPostSave(userId: string, precomputedSummaries?: any[]) {
    const [allUsers, steals, allOwnerships] = await Promise.all([
        (prisma as any).user.findMany({ where: { nickname: { not: 'modo' } }, include: { sets: true, fines: true, badges: true, sallyUps: true } }),
        (prisma as any).badgeEvent.findMany({ where: { eventType: "STEAL" } }),
        (prisma as any).badgeOwnership.findMany()
    ]);

    const summaries = precomputedSummaries ?? getUserSummaries(allUsers, steals);

    // Build a Map for O(1) ownership lookup — replaces N individual findUnique queries
    const ownershipMap = new Map<string, any>(allOwnerships.map((o: any) => [o.badgeKey, o]));

    for (const def of BADGE_DEFINITIONS) {
        const ownership = ownershipMap.get(def.key) ?? null;
        if (ownership?.locked) continue;

        let bestUser: any = null;
        let bestValue = 0;

        if (def.metricType === "MAX_BONUS") {
            summaries.forEach((s: any) => {
                if (s.maxBonus > bestValue || (s.maxBonus === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalAll"))) {
                    bestValue = s.maxBonus; bestUser = s;
                }
            });
        } else if (def.metricType === "BONUS_STREAK") {
            summaries.forEach((s: any) => {
                if (s.maxBonusStreak > bestValue || (s.maxBonusStreak === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalAll"))) {
                    bestValue = s.maxBonusStreak; bestUser = s;
                }
            });
        } else if (def.metricType === "PERFECT_TARGET_STREAK") {
            summaries.forEach((s: any) => {
                if (s.maxPerfectStreak > bestValue || (s.maxPerfectStreak === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalAll"))) {
                    bestValue = s.maxPerfectStreak; bestUser = s;
                }
            });
        } else if (def.metricType === "STEAL_COUNT") {
            summaries.forEach((s: any) => {
                if (s.stealCount > bestValue || (s.stealCount === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalAll"))) {
                    bestValue = s.stealCount; bestUser = s;
                }
            });
        } else if (def.metricType === "BALANCE_RATIO") {
            summaries.forEach((s: any) => {
                if (s.balanceRatio > bestValue || (s.balanceRatio === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalAll"))) {
                    bestValue = s.balanceRatio; bestUser = s;
                }
            });
        } else if (def.metricType === "MONO_EXO_STREAK") {
            summaries.forEach((s: any) => {
                if (s.maxMonoExoStreak > bestValue || (s.maxMonoExoStreak === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalAll"))) {
                    bestValue = s.maxMonoExoStreak; bestUser = s;
                }
            });
        } else if (def.metricType === "TRI_EXO_STREAK") {
            summaries.forEach((s: any) => {
                if (s.maxTriExoStreak > bestValue || (s.maxTriExoStreak === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalAll"))) {
                    bestValue = s.maxTriExoStreak; bestUser = s;
                }
            });
        } else if (def.metricType === "QUATUOR_STREAK") {
            // Computed on the fly using check function across all dates
            summaries.forEach((s: any) => {
                let maxStreak = 0;
                let currentStreak = 0;
                const days = Object.keys(s.setsByTarget).map(k => k); // Not accurate, we need dates. We can just iterate backwards from today
                // Simple version: check user's sets dates array
                const uniqueDates = Array.from(new Set(allUsers.find((u: any) => u.id === s.id)?.sets?.map((set: any) => set.date) || [])).sort() as string[];
                for (let i = 0; i < uniqueDates.length; i++) {
                    const d = uniqueDates[i];
                    if (s.hasQuatuorStreak(d)) {
                        currentStreak++;
                    } else {
                        currentStreak = 0;
                    }
                    if (currentStreak > maxStreak) maxStreak = currentStreak;

                    // Break if streak missed? No, we check consecutive days played.
                    // Actually if they miss a day, it also breaks. 
                    if (i > 0) {
                        const prevDate = new Date(uniqueDates[i - 1]);
                        const currDate = new Date(d);
                        if ((currDate.getTime() - prevDate.getTime()) > (1000 * 3600 * 24 * 1.5)) {
                            currentStreak = 0;
                        }
                    }
                }

                if (maxStreak > bestValue || (maxStreak === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalAll"))) {
                    bestValue = maxStreak; bestUser = s;
                }
            });
        } else if (def.metricType === "MAX_SET") {
            summaries.forEach((s: any) => {
                const val = def.exerciseScope === "PUSHUPS" ? s.maxSetPushups : def.exerciseScope === "PULLUPS" ? s.maxSetPullups : def.exerciseScope === "SQUATS" ? s.maxSetSquats : def.exerciseScope === "PLANK" ? s.maxSetPlanks : s.maxSetAll;
                const totalKey = def.exerciseScope === "PUSHUPS" ? "totalPushups" : def.exerciseScope === "PULLUPS" ? "totalPullups" : def.exerciseScope === "SQUATS" ? "totalSquats" : def.exerciseScope === "PLANK" ? "totalPlanks" : "totalAll";
                if (val > bestValue || (val === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, totalKey))) {
                    bestValue = val; bestUser = s;
                }
            });
        } else if (def.metricType === "SERIES_COUNT") {
            const exo = def.exerciseScope === "PUSHUPS" ? "PUSHUP" : def.exerciseScope === "PULLUPS" ? "PULLUP" : def.exerciseScope === "PLANK" ? "PLANK" : "SQUAT";
            const totalKey = def.exerciseScope === "PUSHUPS" ? "totalPushups" : def.exerciseScope === "PULLUPS" ? "totalPullups" : def.exerciseScope === "PLANK" ? "totalPlanks" : "totalSquats";
            summaries.forEach((s: any) => {
                const count = s.setsByTarget(exo, def.seriesTarget!);
                if (count > bestValue || (count === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, totalKey))) {
                    bestValue = count; bestUser = s;
                }
            });
        } else if (def.metricType === "TORCH_STREAK") {
            summaries.forEach((s: any) => {
                if (s.maxTorchStreak > bestValue || (s.maxTorchStreak === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalAll"))) {
                    bestValue = s.maxTorchStreak; bestUser = s;
                }
            });
        } else if (def.metricType === "MILESTONE_SET") {
            for (const s of summaries) { if (s.maxSetAll >= def.threshold!) await awardMilestone(s.id, def.key, 1); }
            continue;
        } else if (def.metricType === "MILESTONE_TOTAL") {
            const scopeField = def.exerciseScope === "PUSHUPS" ? "totalPushups" : def.exerciseScope === "PULLUPS" ? "totalPullups" : def.exerciseScope === "SQUATS" ? "totalSquats" : def.exerciseScope === "PLANK" ? "totalPlanks" : "totalAll";
            for (const s of summaries) { if (s[scopeField] >= def.threshold!) await awardMilestone(s.id, def.key, 1); }
            continue;
        } else if (def.metricType === "FINES_AMOUNT") {
            for (const s of summaries) { if (s.totalFinesAmount >= def.threshold!) await awardMilestone(s.id, def.key, 1); }
            continue;
        } else if (def.metricType === "TOTAL_FINES_AMOUNT") {
            summaries.forEach((s: any) => {
                if (s.totalFinesAmount > bestValue || (s.totalFinesAmount === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalAll"))) {
                    bestValue = s.totalFinesAmount; bestUser = s;
                }
            });
        } else if (def.metricType === "TIME_AWARD") {
            for (const s of summaries) { if (s.earlyStreak >= (def.threshold || 1)) await awardMilestone(s.id, def.key, s.earlyStreak); }
            continue;
        } else if (def.metricType === "TIME_AWARD_LATE") {
            for (const s of summaries) { if (s.lateStreak >= (def.threshold || 1)) await awardMilestone(s.id, def.key, s.lateStreak); }
            continue;
        } else if (def.metricType === "TIME_AWARD_EXACT") {
            for (const s of summaries) { if (s.noonStreak >= (def.threshold || 1)) await awardMilestone(s.id, def.key, s.noonStreak); }
            continue;
        } else if (def.metricType === "STREAK_NO_FINES") {
            for (const s of summaries) { if (s.fineFreeStreak >= def.threshold!) await awardMilestone(s.id, def.key, s.fineFreeStreak); }
            continue;
        } else if (def.metricType === "SPRINTER_COUNT") {
            for (const s of summaries) { if (s.sprinterCount >= def.threshold!) await awardMilestone(s.id, def.key, 1); }
            continue;
        } else if (def.metricType === "DATE_AWARD_HARD") {
            const dateMap: any = { 'st_patrick': '-03-17', 'dday_hero': '-06-06', 'easter_egg': '2026-04-05' };
            for (const s of summaries) {
                const target = dateMap[def.key];
                if (s.checkDatePlayed(target)) await awardMilestone(s.id, def.key, 1);
            }
            continue;
        } else if (def.metricType === "DATE_AWARD_HARD_GOLD") {
            if (def.key === "st_patrick_gold") {
                for (const s of summaries) { if (s.hasStPatrickGold()) await awardMilestone(s.id, def.key, 1); }
            }
            continue;
        } else if (def.metricType === "MARVIN_AWARD") {
            const embi = summaries.find((u: any) => u.nickname.toLowerCase() === 'embi');
            const embiReps = embi ? embi.getMarvinReps() : 0;
            // Only award if EMBI has reps, and others have >= EMBI reps (including EMBI himself)
            if (embiReps > 0) {
                for (const s of summaries) { if (s.getMarvinReps() >= embiReps) await awardMilestone(s.id, def.key, 1); }
            }
            continue;
        } else if (def.metricType === "DATE_AWARD") {
            for (const s of summaries) {
                const isAwarded = (def.key === 'st_damien' && s.hasStDamien) || (def.key === 'st_nicolas' && s.hasStNicolas);
                if (isAwarded) await awardMilestone(s.id, def.key, 1);
            }
            continue;
        } else if (def.metricType === "PERIOD_VOLUME") {
            const days = def.key.includes("week") ? 7 : 1; // day or week
            const exo = def.exerciseScope === "PUSHUPS" ? "PUSHUP" : "SQUAT";
            for (const s of summaries) { if (s.getHistoricalMaxVolume(days, exo) >= def.threshold!) await awardMilestone(s.id, def.key, 1); }
            continue;
        } else if (def.metricType === "APRIL_FOOLS_TIER") {
            // Evaluated explicitly on April 1st.
            const todayISO = getTodayISO();
            if (todayISO.endsWith("-04-01")) {
                const dayScores = summaries.map((s: any) => {
                    const todaySets = s.sets?.filter((s2: any) => s2.date === todayISO) || [];
                    const todayReps = todaySets.reduce((sum: number, s2: any) => sum + s2.reps, 0);
                    return { id: s.id, todayReps };
                }).filter(x => x.todayReps > 0).sort((a: any, b: any) => b.todayReps - a.todayReps);

                if (dayScores.length > 0) {
                    if (def.key === "april_fools_1") {
                        await awardMilestone(dayScores[0].id, def.key, dayScores[0].todayReps);
                    } else if (def.key === "april_fools_2" && dayScores.length > 1) {
                        await awardMilestone(dayScores[1].id, def.key, dayScores[1].todayReps);
                    } else if (def.key === "april_fools_3" && dayScores.length > 2) {
                        await awardMilestone(dayScores[2].id, def.key, dayScores[2].todayReps);
                    } else if (def.key === "april_fools_4" && dayScores.length > 3) {
                        await awardMilestone(dayScores[3].id, def.key, dayScores[3].todayReps);
                    } else if (def.key === "april_fools_5" && dayScores.length > 4) {
                        await awardMilestone(dayScores[4].id, def.key, dayScores[4].todayReps);
                    } else if (def.key === "april_fools_6" && dayScores.length > 5) {
                        // All others from rank 6 below get the lowest badge
                        const lowestPromises = [];
                        for (let i = 5; i < dayScores.length; i++) {
                            lowestPromises.push(awardMilestone(dayScores[i].id, def.key, dayScores[i].todayReps));
                        }
                        await Promise.all(lowestPromises);
                    }
                }
            }
            continue;
        } else if (def.metricType === "HEADHUNTER_COUNT") {
            for (const s of summaries) { if (s.headhunterCount >= def.threshold!) await awardMilestone(s.id, def.key, 1); }
            continue;
        } else if (def.metricType === "DATE_COMPETITIVE_REPS") {
            const target = "2026-03-17";
            summaries.forEach((s: any) => {
                const val = s.getDayTotal(target);
                if (val > bestValue || (val === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalAll"))) {
                    bestValue = val; bestUser = s;
                }
            });
        } else if (def.metricType === "DATE_COMPETITIVE_SET_PUSHUPS") {
            const target = "2026-03-17";
            summaries.forEach((s: any) => {
                const val = s.getDayMaxSet(target, "PUSHUP");
                if (val > bestValue || (val === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalPushups"))) {
                    bestValue = val; bestUser = s;
                }
            });
        } else if (def.metricType === "DATE_COMPETITIVE_SET_PULLUPS") {
            const target = "2026-03-17";
            summaries.forEach((s: any) => {
                const val = s.getDayMaxSet(target, "PULLUP");
                if (val > bestValue || (val === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalPullups"))) {
                    bestValue = val; bestUser = s;
                }
            });
        } else if (def.metricType === "DATE_COMPETITIVE_SET_SQUATS") {
            const target = "2026-03-17";
            summaries.forEach((s: any) => {
                const val = s.getDayMaxSet(target, "SQUAT");
                if (val > bestValue || (val === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalSquats"))) {
                    bestValue = val; bestUser = s;
                }
            });
        } else if (def.metricType === "MONTH_TOP_VOLUME") {
            if (!isLastDayOfMonth(getTodayISO())) continue;
            const currentMonth = getTodayISO().substring(0, 7); // "YYYY-MM"
            summaries.forEach((s: any) => {
                const val = s.getMonthTotal(currentMonth);
                if (val > bestValue || (val === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalAll"))) {
                    bestValue = val; bestUser = s;
                }
            });
        } else if (def.metricType === "MONTH_TOP_SET") {
            if (!isLastDayOfMonth(getTodayISO())) continue;
            const currentMonth = getTodayISO().substring(0, 7);
            const exo = def.exerciseScope === "PUSHUPS" ? "PUSHUP" : def.exerciseScope === "PULLUPS" ? "PULLUP" : def.exerciseScope === "PLANK" ? "PLANK" : "SQUAT";
            summaries.forEach((s: any) => {
                const val = s.getMonthMaxSet(currentMonth, exo);
                if (val > bestValue || (val === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalAll"))) {
                    bestValue = val; bestUser = s;
                }
            });
        } else if (def.metricType === "MONTH_TOTAL_EXO") {
            if (!isLastDayOfMonth(getTodayISO())) continue;
            const currentMonth = getTodayISO().substring(0, 7);
            const exo = def.exerciseScope === "PUSHUPS" ? "PUSHUP" : def.exerciseScope === "PULLUPS" ? "PULLUP" : def.exerciseScope === "PLANK" ? "PLANK" : "SQUAT";
            summaries.forEach((s: any) => {
                const val = s.getMonthTotal(currentMonth, exo);
                if (val > bestValue || (val === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalAll"))) {
                    bestValue = val; bestUser = s;
                }
            });
        } else if (def.metricType === "TRINITY_GOLD" || def.metricType === "TRINITY_ULTIMATE" || def.metricType === "QUATUOR_GOLD" || def.metricType === "QUATUOR_ULTIMATE") {
            const today = getTodayISO();
            const yesterday = getYesterdayISO();
            summaries.forEach((s: any) => {
                const hasToday = def.metricType === "TRINITY_GOLD" ? s.hasTrinityGold(today) : def.metricType === "TRINITY_ULTIMATE" ? s.hasTrinityUltimate(today) : def.metricType === "QUATUOR_GOLD" ? s.hasQuatuorGold(today) : s.hasQuatuorUltimate(today);
                const hasYesterday = def.metricType === "TRINITY_GOLD" ? s.hasTrinityGold(yesterday) : def.metricType === "TRINITY_ULTIMATE" ? s.hasTrinityUltimate(yesterday) : def.metricType === "QUATUOR_GOLD" ? s.hasQuatuorGold(yesterday) : s.hasQuatuorUltimate(yesterday);

                if (hasToday || hasYesterday) {
                    const val = hasToday ? s.getDayTotal(today) : s.getDayTotal(yesterday);
                    if (val > bestValue || (val === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalAll"))) {
                        bestValue = val; bestUser = s;
                    }
                }
            });
        } else if (def.metricType === "SALLY_PART") {
            const today = getTodayISO();
            if (isLastDayOfMonth(today)) {
                for (const s of summaries) {
                    if (s.hasSallyUpParticipation(today)) await awardMilestone(s.id, def.key, 1);
                }
            }
            continue;
        } else if (def.metricType === "SALLY_PODIUM") {
            const today = getTodayISO();
            if (isLastDayOfMonth(today)) {
                summaries.forEach((s: any) => {
                    const val = s.getSallyUpSeconds(today);
                    if (val > bestValue || (val === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalAll"))) {
                        bestValue = val; bestUser = s;
                    }
                });
            }
        } else if (def.metricType === "FIRST_REACH") {
            const scope = def.exerciseScope === "PUSHUPS" ? "maxSetPushups" : def.exerciseScope === "PULLUPS" ? "maxSetPullups" : def.exerciseScope === "PLANK" ? "maxSetPlanks" : "maxSetSquats";
            summaries.forEach((s: any) => {
                if (s[scope] >= def.threshold!) {
                    if (s[scope] > bestValue || (s[scope] === bestValue && isBetterTieBreak(s, bestUser, "totalAll"))) {
                        bestValue = s[scope]; bestUser = s;
                    }
                }
            });
        } else if (def.metricType === "FIRST_REACH_TOTAL") {
            const scope = def.exerciseScope === "PUSHUPS" ? "totalPushups" : def.exerciseScope === "PULLUPS" ? "totalPullups" : def.exerciseScope === "PLANK" ? "totalPlanks" : "totalSquats";
            summaries.forEach((s: any) => {
                if (s[scope] >= def.threshold!) {
                    if (s[scope] > bestValue || (s[scope] === bestValue && isBetterTieBreak(s, bestUser, "totalAll"))) {
                        bestValue = s[scope]; bestUser = s;
                    }
                }
            });
        }

        if (bestUser && bestValue > 0) {
            const isSameUser = ownership?.currentUserId === bestUser.id;

            // Historical Record Logic: Only award if strictly better than the current record
            const isBetterValue = bestValue > (ownership?.currentValue || 0);

            if (isSameUser && !isBetterValue) continue;

            // Anti-duplicate: check if identical record was JUST created (within last 5s)
            const recentSameEvent = await (prisma as any).badgeEvent.findFirst({
                where: {
                    badgeKey: def.key,
                    toUserId: (bestUser as any).id,
                    newValue: bestValue,
                    createdAt: { gte: new Date(Date.now() - 5000) }
                }
            });
            if (recentSameEvent) continue;

            const eventType = !ownership?.currentUserId
                ? (def.isUnique ? "UNIQUE_AWARDED" : "CLAIM")
                : (isSameUser ? "CLAIM" : "STEAL");

            const isSameRecord = ownership &&
                ownership.currentUserId === (bestUser as any).id &&
                ownership.currentValue === bestValue;

            try {
                await (prisma as any).badgeOwnership.upsert({
                    where: { badgeKey: def.key },
                    update: {
                        currentUserId: (bestUser as any).id,
                        currentValue: bestValue,
                        achievedAt: isSameRecord ? ownership.achievedAt : new Date(),
                        locked: def.isUnique
                    },
                    create: {
                        badgeKey: def.key,
                        currentUserId: (bestUser as any).id,
                        currentValue: bestValue,
                        achievedAt: new Date(),
                        locked: def.isUnique
                    }
                });

                await (prisma as any).badgeEvent.create({
                    data: {
                        badgeKey: def.key,
                        fromUserId: isSameUser ? null : ownership?.currentUserId,
                        toUserId: (bestUser as any).id,
                        eventType,
                        previousValue: ownership?.currentValue,
                        newValue: bestValue
                    }
                });

                // --- VENDETTA BONUS LOGIC ---
                if (eventType === "STEAL" && !isSameUser && ownership?.currentUserId) {
                    // Find if the person who just stole it (bestUser.id) was the one who lost it previously
                    const lastEvents = await (prisma as any).badgeEvent.findMany({
                        where: { badgeKey: def.key },
                        orderBy: { createdAt: 'desc' },
                        take: 3 // Current one + the one where bestUser lost it + maybe one before
                    });

                    // lastEvents[0] is the one we just created.
                    // lastEvents[1] should be the one where ownership.currentUserId stole it from bestUser.id
                    const prevEvent = lastEvents[1];
                    if (prevEvent && prevEvent.fromUserId === bestUser.id && prevEvent.toUserId === ownership.currentUserId) {
                        const timeSinceLoss = Date.now() - new Date(prevEvent.createdAt).getTime();
                        if (timeSinceLoss < 24 * 60 * 60 * 1000) {
                            // Vendetta confirmed! 
                            // We need the duration bestUser held it *before* losing it.
                            // We look for the event where bestUser gained it lastEvents[2] or older
                            const gainEvent = await (prisma as any).badgeEvent.findFirst({
                                where: { badgeKey: def.key, toUserId: bestUser.id, createdAt: { lt: prevEvent.createdAt } },
                                orderBy: { createdAt: 'desc' }
                            });

                            if (gainEvent) {
                                const heldDurationMs = new Date(prevEvent.createdAt).getTime() - new Date(gainEvent.createdAt).getTime();
                                const heldDays = Math.max(1, Math.floor(heldDurationMs / (24 * 60 * 60 * 1000)));
                                const bonusXP = Math.min(heldDays * 50, 1000);

                                // Award XP Adjustment
                                await (prisma as any).xpAdjustment.create({
                                    data: {
                                        userId: bestUser.id,
                                        amount: bonusXP,
                                        reason: `Vendetta : Récupération du badge ${def.name} (${heldDays}j de possession vengés)`
                                    }
                                });
                            }
                        }
                    }
                }
                // --- END VENDETTA ---

                // Featured Badge Logic
                const featured = await (prisma as any).globalConfig.findUnique({ where: { key: "featuredBadgeKey" } });
                if (featured && featured.value === def.key) {
                    // Increment count
                    await (prisma as any).user.update({
                        where: { id: (bestUser as any).id },
                        data: { featuredClaimsCount: { increment: 1 } }
                    });
                    // Rotate immediately
                    await rotateFeaturedBadge();
                }
            } catch (error) {
                console.error(`Error updating unique badge ownership for ${def.key}:`, error);
            }
        }
    }

    // Auto-rotate Featured Badge after 7 days
    const featured = await (prisma as any).globalConfig.findUnique({ where: { key: "featuredBadgeKey" } });
    if (!featured) {
        await rotateFeaturedBadge();
    } else {
        const lastUpdate = new Date(featured.updatedAt).getTime();
        const now = Date.now();
        if (now - lastUpdate > 7 * 24 * 60 * 60 * 1000) {
            await rotateFeaturedBadge();
        }
    }
}

export async function rotateFeaturedBadge() {
    // Fetch all current ownerships to see what's taken
    const allOwnerships = await (prisma as any).badgeOwnership.findMany();
    const ownedKeys = new Set(allOwnerships.map((o: any) => o.badgeKey));

    // Pick a random badge that is NOT unique or legendary or event
    const possibleBadges = BADGE_DEFINITIONS.filter(b =>
        !b.isUnique &&
        b.type !== "LEGENDARY" &&
        b.type !== "EVENT" &&
        b.metricType !== "HEADHUNTER_COUNT"
    );

    // Prioritization:
    // 1. Competitive badges (stealable)
    // 2. Badges that nobody has yet
    const competitiveBadges = possibleBadges.filter(b => b.type === "COMPETITIVE");
    const unownedBadges = possibleBadges.filter(b => !ownedKeys.has(b.key));

    let candidates = possibleBadges;
    if (competitiveBadges.length > 0) {
        // 70% chance to pick a competitive one to encourage "stealing"
        if (Math.random() < 0.7) {
            candidates = competitiveBadges;
        } else if (unownedBadges.length > 0) {
            candidates = unownedBadges;
        }
    } else if (unownedBadges.length > 0) {
        candidates = unownedBadges;
    }

    const randomBadge = candidates[Math.floor(Math.random() * candidates.length)];

    await (prisma as any).globalConfig.upsert({
        where: { key: "featuredBadgeKey" },
        update: { value: randomBadge.key, updatedAt: new Date() },
        create: { key: "featuredBadgeKey", value: randomBadge.key },
    });
}

async function awardMilestone(userId: string, badgeKey: string, value: number = 1) {
    try {
        // Only use Event table as a high-watermark for milestones since Ownership is strictly 1-to-1 unique
        const existingEvents = await (prisma as any).badgeEvent.findMany({
            where: { badgeKey, toUserId: userId },
            orderBy: { newValue: 'desc' },
            take: 1
        });
        const maxValue = existingEvents[0]?.newValue || 0;

        if (value > maxValue) {
            // Anti-spam: check if an identical event (any value) was created very recently for this user
            const recentEvent = await (prisma as any).badgeEvent.findFirst({
                where: { toUserId: userId, createdAt: { gte: new Date(Date.now() - 2000) } }
            });
            if (recentEvent && recentEvent.badgeKey === badgeKey) return;

            await (prisma as any).badgeEvent.create({
                data: { badgeKey, fromUserId: null, toUserId: userId, eventType: "UNIQUE_AWARDED", previousValue: maxValue, newValue: value }
            });
        }
    } catch (error) {
        console.error(`Failed to award milestone ${badgeKey} to ${userId}:`, error);
    }
}

function isBetterTieBreak(current: any, best: any, totalKey: string) {
    if (!best) return true;
    if (current[totalKey] > best[totalKey]) return true;
    return false;
}

export function calculateBadgeProgress(def: any, summary: any) {
    if (def.type === "COMPETITIVE") return 0; // Competitive badges are binary or record-based

    let current = 0;
    let target = def.threshold || 1;

    switch (def.metricType) {
        case "MILESTONE_TOTAL":
            const scope = def.exerciseScope === "PUSHUPS" ? "totalPushups" : def.exerciseScope === "PULLUPS" ? "totalPullups" : def.exerciseScope === "SQUATS" ? "totalSquats" : "totalAll";
            current = summary[scope] || 0;
            break;
        case "MILESTONE_SET":
            current = summary.maxSetAll || 0;
            break;
        case "STREAK_NO_FINES":
            current = summary.fineFreeStreak || 0;
            break;
        case "TIME_AWARD":
            current = summary.earlyStreak || 0;
            break;
        case "TIME_AWARD_LATE":
            current = summary.lateStreak || 0;
            break;
        case "TIME_AWARD_EXACT":
            current = summary.noonStreak || 0;
            break;
        case "BONUS_STREAK":
            current = summary.maxBonusStreak || 0;
            break;
        case "PERFECT_TARGET_STREAK":
            current = summary.maxPerfectStreak || 0;
            break;
        case "MONO_EXO_STREAK":
            current = summary.maxMonoExoStreak || 0;
            break;
        case "TRI_EXO_STREAK":
            current = summary.maxTriExoStreak || 0;
            break;
        case "SERIES_COUNT":
            const exo = def.exerciseScope === "PUSHUPS" ? "PUSHUP" : def.exerciseScope === "PULLUPS" ? "PULLUP" : "SQUAT";
            current = summary.setsByTarget(exo, def.seriesTarget!);
            break;
        case "PERIOD_VOLUME":
            const days = def.key.includes("week") ? 7 : 1;
            const exoPeriod = def.exerciseScope === "PUSHUPS" ? "PUSHUP" : "SQUAT";
            current = summary.getHistoricalMaxVolume(days, exoPeriod);
            break;
        default:
            return 0;
    }

    return Math.min(100, Math.floor((current / target) * 100));
}

export function getShowcaseData(summary: any, earnedBadgeKeys: string[]) {
    const earnedSet = new Set(earnedBadgeKeys);

    // Group badges by category
    const categories: Record<string, any> = {
        HOLISTIQUE: { id: "HOLISTIQUE", label: "Holistique", emoji: "💎", earned: [], pending: [] },
        REGULARITY: { id: "REGULARITY", label: "Régularité", emoji: "🔥", earned: [], pending: [] },
        PUSHUPS: { id: "PUSHUPS", label: "Pompes", emoji: "🦾", earned: [], pending: [] },
        PULLUPS: { id: "PULLUPS", label: "Tractions", emoji: "🧗", earned: [], pending: [] },
        SQUATS: { id: "SQUATS", label: "Squats", emoji: "🗿", earned: [], pending: [] },
        GLOBAL: { id: "GLOBAL", label: "Global & Event", emoji: "🌍", earned: [], pending: [] },
    };

    BADGE_DEFINITIONS.forEach(def => {
        const cat = categories[def.category || "GLOBAL"];
        if (!cat) return;

        if (earnedSet.has(def.key)) {
            cat.earned.push(def);
        } else {
            const progress = calculateBadgeProgress(def, summary);
            // Only show pending badges that have some progress or are low threshold?
            // Actually, showing all unearned badges in the category is better for the "catalogue" feel
            cat.pending.push({ ...def, progress });
        }
    });

    // Sort pending by progress (most advanced first)
    Object.values(categories).forEach((cat: any) => {
        cat.pending.sort((a: any, b: any) => b.progress - a.progress);
    });

    return Object.values(categories);
}
