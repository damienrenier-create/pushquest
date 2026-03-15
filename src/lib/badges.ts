import prisma from "./prisma";
import { getRequiredRepsForDate, getTodayISO, isLastDayOfMonth } from "./challenge";

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
        let maxSetPushups = 0;
        let maxSetPullups = 0;
        let maxSetSquats = 0;
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

        const datePlayedMap: Record<string, boolean> = {};

        days.forEach((d: string) => {
            const daySets = sets.filter((s: any) => s.date === d);
            const req = getRequiredRepsForDate(d);
            let dayTotal = 0;
            let dayPushups = 0;
            let dayPullups = 0;
            let daySquats = 0;
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
                } else if (s.exercise === "PULLUP") {
                    dayPullups += s.reps;
                    totalPullups += s.reps;
                    if (s.reps > maxSetPullups) maxSetPullups = s.reps;
                } else if (s.exercise === "SQUAT") {
                    daySquats += s.reps;
                    totalSquats += s.reps;
                    if (s.reps > maxSetSquats) maxSetSquats = s.reps;
                }
            });

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
            maxSetAll,
            totalFinesAmount,
            totalPushups,
            totalPullups,
            totalSquats,
            totalAll: totalPushups + totalPullups + totalSquats,
            setsByTarget: (exo: string, target: number) => setsByExoTarget[`${exo}_${target}`] || 0,
            earlyStreak: earlyStreakMax,
            lateStreak: lateStreakMax,
            noonStreak: noonStreakMax,
            checkDatePlayed: (dateStr: string) => {
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
            sprinterCount: sprinterCounts[u.id] || 0,
            headhunterCount: u.featuredClaimsCount || 0,
            getDayTotal: (date: string) => sets.filter((s: any) => s.date === date).reduce((sum: number, s: any) => sum + s.reps, 0),
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
                    return exoTotal >= 3 * req;
                }) && req > 0;
            },
            getDaySum: (date: string, exo: string) => sets.filter((s: any) => s.date === date && s.exercise === exo).reduce((sum: number, s: any) => sum + s.reps, 0),
            getScaleReps: (date: string) => Array.from(new Set(sets.filter((s: any) => s.date === date).map((s: any) => s.reps))) as number[]
        };
    });
}

export async function updateBadgesPostSave(userId: string) {
    const [allUsers, steals] = await Promise.all([
        (prisma as any).user.findMany({ where: { nickname: { not: 'modo' } }, include: { sets: true, fines: true, badges: true } }),
        (prisma as any).badgeEvent.findMany({ where: { eventType: "STEAL" } })
    ]);

    const summaries = getUserSummaries(allUsers, steals);

    for (const def of BADGE_DEFINITIONS) {
        const ownership = await (prisma as any).badgeOwnership.findUnique({ where: { badgeKey: def.key } });
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
        } else if (def.metricType === "MAX_SET") {
            summaries.forEach((s: any) => {
                const val = def.exerciseScope === "PUSHUPS" ? s.maxSetPushups : def.exerciseScope === "PULLUPS" ? s.maxSetPullups : def.exerciseScope === "SQUATS" ? s.maxSetSquats : s.maxSetAll;
                const totalKey = def.exerciseScope === "PUSHUPS" ? "totalPushups" : def.exerciseScope === "PULLUPS" ? "totalPullups" : def.exerciseScope === "SQUATS" ? "totalSquats" : "totalAll";
                if (val > bestValue || (val === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, totalKey))) {
                    bestValue = val; bestUser = s;
                }
            });
        } else if (def.metricType === "SERIES_COUNT") {
            const exo = def.exerciseScope === "PUSHUPS" ? "PUSHUP" : def.exerciseScope === "PULLUPS" ? "PULLUP" : "SQUAT";
            const totalKey = def.exerciseScope === "PUSHUPS" ? "totalPushups" : def.exerciseScope === "PULLUPS" ? "totalPullups" : "totalSquats";
            summaries.forEach((s: any) => {
                const count = s.setsByTarget(exo, def.seriesTarget!);
                if (count > bestValue || (count === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, totalKey))) {
                    bestValue = count; bestUser = s;
                }
            });
        } else if (def.metricType === "MILESTONE_SET") {
            for (const s of summaries) { if (s.maxSetAll >= def.threshold!) await awardMilestone(s.id, def.key, 1); }
            continue;
        } else if (def.metricType === "MILESTONE_TOTAL") {
            const scopeField = def.exerciseScope === "PUSHUPS" ? "totalPushups" : def.exerciseScope === "PULLUPS" ? "totalPullups" : def.exerciseScope === "SQUATS" ? "totalSquats" : "totalAll";
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
            const exo = def.exerciseScope === "PUSHUPS" ? "PUSHUP" : def.exerciseScope === "PULLUPS" ? "PULLUP" : "SQUAT";
            summaries.forEach((s: any) => {
                const val = s.getMonthMaxSet(currentMonth, exo);
                if (val > bestValue || (val === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalAll"))) {
                    bestValue = val; bestUser = s;
                }
            });
        } else if (def.metricType === "MONTH_TOTAL_EXO") {
            if (!isLastDayOfMonth(getTodayISO())) continue;
            const currentMonth = getTodayISO().substring(0, 7);
            const exo = def.exerciseScope === "PUSHUPS" ? "PUSHUP" : def.exerciseScope === "PULLUPS" ? "PULLUP" : "SQUAT";
            summaries.forEach((s: any) => {
                const val = s.getMonthTotal(currentMonth, exo);
                if (val > bestValue || (val === bestValue && bestValue > 0 && isBetterTieBreak(s, bestUser, "totalAll"))) {
                    bestValue = val; bestUser = s;
                }
            });
        } else if (def.metricType === "TRINITY_GOLD") {
            const today = getTodayISO();
            for (const s of summaries) { if (s.hasTrinityGold(today)) await awardMilestone(s.id, def.key, 1); }
            continue;
        } else if (def.metricType === "TRINITY_ULTIMATE") {
            const today = getTodayISO();
            for (const s of summaries) { if (s.hasTrinityUltimate(today)) await awardMilestone(s.id, def.key, 1); }
            continue;
        } else if (def.metricType === "FIRST_REACH") {
            const scope = def.exerciseScope === "PUSHUPS" ? "maxSetPushups" : def.exerciseScope === "PULLUPS" ? "maxSetPullups" : "maxSetSquats";
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

            await (prisma as any).badgeOwnership.update({
                where: { badgeKey: def.key },
                data: {
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
    // Pick a random badge that is NOT unique or legendary or event
    const possibleBadges = BADGE_DEFINITIONS.filter(b => 
        !b.isUnique && 
        b.type !== "LEGENDARY" && 
        b.type !== "EVENT" &&
        b.metricType !== "HEADHUNTER_COUNT"
    );
    const randomBadge = possibleBadges[Math.floor(Math.random() * possibleBadges.length)];
    
    await (prisma as any).globalConfig.upsert({
        where: { key: "featuredBadgeKey" },
        update: { value: randomBadge.key, updatedAt: new Date() },
        create: { key: "featuredBadgeKey", value: randomBadge.key },
    });
}

async function awardMilestone(userId: string, badgeKey: string, value: number = 1) {
    // Only use Event table as a high-watermark for milestones since Ownership is strictly 1-to-1 unique
    const existingEvents = await (prisma as any).badgeEvent.findMany({
        where: { badgeKey, toUserId: userId },
        orderBy: { newValue: 'desc' }
    });
    const maxValue = existingEvents[0]?.newValue || 0;

    if (value > maxValue) {
        await (prisma as any).badgeEvent.create({
            data: { badgeKey, fromUserId: null, toUserId: userId, eventType: "UNIQUE_AWARDED", previousValue: maxValue, newValue: value }
        });
    }
}

function isBetterTieBreak(current: any, best: any, totalKey: string) {
    if (!best) return true;
    if (current[totalKey] > best[totalKey]) return true;
    return false;
}
