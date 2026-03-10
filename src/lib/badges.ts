import prisma from "./prisma";
import { getRequiredRepsForDate, getTodayISO } from "./challenge";

import { BADGE_DEFINITIONS } from "@/config/badges";

export async function initBadges() {
    for (const def of BADGE_DEFINITIONS) {
        const { type, condition, ...dbDef } = def as any;
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
    // 1. Calculate global sprinter stats (First to reach daily target)
    const allDays = Array.from(new Set(allUsers.flatMap(u => (u.sets || []).map((s: any) => s.date)))).sort() as string[];
    const sprinterCounts: Record<string, number> = {};
    allUsers.forEach(u => sprinterCounts[u.id] = 0);

    allDays.forEach(date => {
        const req = getRequiredRepsForDate(date);
        if (req <= 0) return;

        let earliestTime = Infinity;
        let winnerId: string | null = null;

        allUsers.forEach(u => {
            const daySets = (u.sets || []).filter((s: { date: string, createdAt: Date }) => s.date === date)
                .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            let sum = 0;
            for (const s of daySets) {
                sum += s.reps;
                if (sum >= req) {
                    const time = new Date(s.createdAt).getTime();
                    if (time < earliestTime) {
                        earliestTime = time;
                        winnerId = u.id;
                    }
                    break;
                }
            }
        });

        if (winnerId) {
            sprinterCounts[winnerId]++;
        }
    });

    return allUsers.map((u: any) => {
        const sets = u.sets || [];
        const pushups = sets.filter((s: any) => s.exercise === "PUSHUP");
        const pullups = sets.filter((s: any) => s.exercise === "PULLUP");
        const squats = sets.filter((s: any) => s.exercise === "SQUAT");

        // Streaks & Bonus
        const days = Array.from(new Set(sets.map((s: any) => s.date))).sort() as string[];
        let currentStreak = 0;
        let maxBonusStreak = 0;
        let perfectStreak = 0;
        let maxPerfectStreak = 0;
        let maxBonus = 0;
        let monoExoStreak = 0;
        let maxMonoExoStreak = 0;
        let triExoStreak = 0;
        let maxTriExoStreak = 0;

        days.forEach((d: string) => {
            const daySets = sets.filter((s: any) => s.date === d);
            const total = daySets.reduce((sum: number, s: any) => sum + s.reps, 0);
            const req = getRequiredRepsForDate(d);
            const bonus = total - req;

            const dayPushups = daySets.filter((s: any) => s.exercise === "PUSHUP").reduce((sum: number, s: any) => sum + s.reps, 0);
            const dayPullups = daySets.filter((s: any) => s.exercise === "PULLUP").reduce((sum: number, s: any) => sum + s.reps, 0);
            const daySquats = daySets.filter((s: any) => s.exercise === "SQUAT").reduce((sum: number, s: any) => sum + s.reps, 0);

            let activeExos = 0;
            if (dayPushups > 0) activeExos++;
            if (dayPullups > 0) activeExos++;
            if (daySquats > 0) activeExos++;

            if (activeExos === 1) {
                monoExoStreak++;
                if (monoExoStreak > maxMonoExoStreak) maxMonoExoStreak = monoExoStreak;
            } else { monoExoStreak = 0; }

            if (total > 0 && dayPushups >= 0.3 * total && dayPullups >= 0.3 * total && daySquats >= 0.3 * total) {
                triExoStreak++;
                if (triExoStreak > maxTriExoStreak) maxTriExoStreak = triExoStreak;
            } else { triExoStreak = 0; }

            if (bonus > 0) {
                currentStreak++;
                if (bonus > maxBonus) maxBonus = bonus;
            } else { currentStreak = 0; }
            if (currentStreak > maxBonusStreak) maxBonusStreak = currentStreak;

            if (total === req && req > 0) {
                perfectStreak++;
                if (perfectStreak > maxPerfectStreak) maxPerfectStreak = perfectStreak;
            } else { perfectStreak = 0; }
        });

        // Steal count
        const stealCount = allEvents.filter((e: any) => e.toUserId === u.id).length;

        // Fines (Only paid ones for Mécène badges)
        const paidFines = u.fines ? u.fines.filter((f: any) => f.status === 'paid') : [];
        const totalFinesAmount = paidFines.reduce((sum: number, f: any) => sum + (f.amountEur || 2), 0);

        const totalPushups = pushups.reduce((a: number, b: any) => a + b.reps, 0);
        const totalPullups = pullups.reduce((a: number, b: any) => a + b.reps, 0);
        const totalSquats = squats.reduce((a: number, b: any) => a + b.reps, 0);
        const totalAll = sets.reduce((a: number, b: any) => a + b.reps, 0);

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
            maxSetPushups: pushups.length ? Math.max(...pushups.map((s: any) => s.reps)) : 0,
            maxSetPullups: pullups.length ? Math.max(...pullups.map((s: any) => s.reps)) : 0,
            maxSetSquats: squats.length ? Math.max(...squats.map((s: any) => s.reps)) : 0,
            maxSetAll: sets.length ? Math.max(...sets.map((s: any) => s.reps)) : 0,
            totalFinesAmount,
            totalPushups,
            totalPullups,
            totalSquats,
            totalAll,
            setsByTarget: (exo: string, target: number) => sets.filter((s: any) => s.exercise === exo && s.reps === target).length,
            // Time awards (Evolutive Streaks)
            earlyStreak: days.reduce((acc: { cur: number; max: number }, d: string) => {
                const daySets = sets.filter((s: any) => s.date === d);
                if (daySets.some((s: any) => new Date(s.createdAt).getHours() < 6)) acc.cur++; else acc.cur = 0;
                acc.max = Math.max(acc.max, acc.cur);
                return acc;
            }, { cur: 0, max: 0 }).max,
            lateStreak: days.reduce((acc: { cur: number; max: number }, d: string) => {
                const daySets = sets.filter((s: any) => s.date === d);
                if (daySets.some((s: any) => new Date(s.createdAt).getHours() >= 22)) acc.cur++; else acc.cur = 0;
                acc.max = Math.max(acc.max, acc.cur);
                return acc;
            }, { cur: 0, max: 0 }).max,
            noonStreak: days.reduce((acc: { cur: number; max: number }, d: string) => {
                const daySets = sets.filter((s: any) => s.date === d);
                if (daySets.some((s: any) => {
                    const dt = new Date(s.createdAt);
                    return dt.getHours() === 12 && dt.getMinutes() === 0;
                })) acc.cur++; else acc.cur = 0;
                acc.max = Math.max(acc.max, acc.cur);
                return acc;
            }, { cur: 0, max: 0 }).max,

            // Date awards (Soft conditions now)
            checkDatePlayed: (dateStr: string) => {
                const target = dateStr.startsWith('-') ? "2026" + dateStr : dateStr;
                const daySets = sets.filter((s: any) => s.date === target);
                return daySets.length > 0;
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
            fineFreeStreak: days.reduce((acc: { cur: number; max: number }, d: string) => {
                const hasFine = u.fines?.some((f: any) => f.date === d);
                if (hasFine) acc.cur = 0; else acc.cur++;
                acc.max = Math.max(acc.max, acc.cur);
                return acc;
            }, { cur: 0, max: 0 }).max,
            sprinterCount: sprinterCounts[u.id] || 0,
        };
    });
}

export async function updateBadgesPostSave(userId: string) {
    await initBadges();

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
                if (s.totalFinesAmount > bestValue) {
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
        } else if (def.metricType === "FIRST_REACH") {
            const scope = def.exerciseScope === "PUSHUPS" ? "maxSetPushups" : def.exerciseScope === "PULLUPS" ? "maxSetPullups" : "maxSetSquats";
            summaries.forEach((s: any) => { if (s[scope] >= def.threshold!) { bestValue = s[scope]; bestUser = s; } });
        }

        if (bestUser && bestValue > 0) {
            const isSameUser = ownership?.currentUserId === bestUser.id;
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
        }
    }
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
