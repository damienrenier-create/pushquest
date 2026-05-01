import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import PantheonClient from "@/app/pantheon/PantheonClient";
import { getUserSummaries, getShowcaseData } from "@/lib/badges";
import { BADGE_DEFINITIONS } from "@/config/badges";
import { getRequiredRepsForDate } from "@/lib/challenge";
import { calculateAllUsersXP } from "@/lib/xp";
import { getCompetitiveDangerList } from "@/lib/competitive-danger";

export const dynamic = "force-dynamic";

export default async function PantheonPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");

    const userId = session.user.id;
    const league = (session.user as any).league || "POMPES";

    const [
        allUsers,
        badgeOwnerships,
        allEvents,
        badgeDefinitions,
    ] = await Promise.all([
        (prisma as any).user.findMany({
            where: {
                nickname: { not: 'modo' }
            },
            include: {
                sets: true,
                fines: true,
                badges: true,
                xpAdjustments: true,
                specialWorkoutEntries: true
            }
        }),
        (prisma as any).badgeOwnership.findMany({
            where: {},
            include: {
                currentUser: true,
                badge: true,
            }
        }),
        (prisma as any).badgeEvent.findMany({
            where: {},
            take: 30,
            orderBy: { createdAt: "desc" },
            include: {
                badge: true,
                fromUser: true,
                toUser: true,
                likes: { select: { userId: true } },
            },
        }),
        (prisma as any).badgeDefinition.findMany(),
    ]);

    const summaries = getUserSummaries(allUsers, allEvents);

    // Calculate all potential badges (Milestones, Events, Legendary) for everyone
    const virtualizedData = summaries.map((s: any) => {
        const virtualBadges: Record<string, boolean> = {};

        BADGE_DEFINITIONS.forEach(def => {
            if (def.type === "COMPETITIVE") return;

            let isEarned = false;
            const threshold = def.threshold || 0;

            if (def.metricType === "MILESTONE_SET") {
                isEarned = s.maxSetAll >= threshold;
            } else if (def.metricType === "MILESTONE_TOTAL") {
                const scopeField = def.exerciseScope === "PUSHUPS" ? "totalPushups" : def.exerciseScope === "PULLUPS" ? "totalPullups" : def.exerciseScope === "SQUATS" ? "totalSquats" : "totalAll";
                isEarned = s[scopeField] >= threshold;
            } else if (def.metricType === "STREAK_NO_FINES") {
                isEarned = s.fineFreeStreak >= threshold;
            } else if (def.metricType === "TIME_AWARD") {
                isEarned = s.earlyStreak >= (threshold || 1);
            } else if (def.metricType === "TIME_AWARD_LATE") {
                isEarned = s.lateStreak >= (threshold || 1);
            } else if (def.metricType === "SPRINTER_COUNT") {
                isEarned = s.sprinterCount >= threshold;
            } else if (def.metricType === "TRINITY_GOLD") {
                isEarned = s.hasTrinityGold(new Date().toISOString().split('T')[0]);
            } else if (def.metricType === "TRINITY_ULTIMATE") {
                isEarned = s.hasTrinityUltimate(new Date().toISOString().split('T')[0]);
            } else if (def.metricType === "HEADHUNTER_COUNT") {
                isEarned = s.headhunterCount >= threshold;
            } else if (def.metricType === "FIRST_REACH") {
                const scope = def.exerciseScope === "PUSHUPS" ? "maxSetPushups" : def.exerciseScope === "PULLUPS" ? "maxSetPullups" : "maxSetSquats";
                isEarned = s[scope] >= threshold;
            } else if (def.metricType === "DATE_AWARD_HARD" || def.metricType === "DATE_AWARD") {
                if (def.key === "equinox_spring") {
                    isEarned = s.hasEquinoxRatio("2026-03-20");
                } else if (def.key === "equinox_autumn") {
                    isEarned = s.hasEquinoxRatio("2026-09-22");
                } else if (def.key === "solstice_summer") {
                    isEarned = s.getHistoricalMaxVolume(1, "ALL") >= 900;
                } else if (def.key === "solstice_winter") {
                    isEarned = (s as any).hasSolsticeWinter("2026-12-21");
                } else if (def.key === "noel_sapin") {
                    isEarned = s.hasChristmasSapin("2026-12-25");
                } else if (def.key === "st_nicolas_6") {
                    isEarned = s.hasSaintNicolasSix("2026-12-06");
                } else {
                    const dateMap: any = { 'st_patrick': '-03-17', 'st_marvin': '-03-08' };
                    const target = dateMap[def.key];
                    if (target) isEarned = s.checkDatePlayed(target);
                }
            } else if (def.metricType === "VOLUME_STREAK") {
                const days = def.key.includes("week") ? 7 : 1;
                const exo = def.exerciseScope === "PUSHUPS" ? "PUSHUP" : def.exerciseScope === "SQUATS" ? "SQUAT" : def.exerciseScope === "PLANK" ? "PLANK" : "ALL";
                isEarned = s.getHistoricalMaxVolume(days, exo) >= threshold;
            } else if (def.metricType === "QUATUOR_STREAK") {
                // Approximate for virtualized view: does the user have enough history?
                // Actually s.maxQuatuorStreak is what we need. Let's assume s has it.
                isEarned = (s as any).maxQuatuorStreak >= threshold;
            } else if (def.metricType === "QUATUOR_GOLD" || def.metricType === "QUATUOR_ULTIMATE") {
                const today = new Date().toISOString().split('T')[0];
                isEarned = def.metricType === "QUATUOR_GOLD" ? s.hasQuatuorGold(today) : s.hasQuatuorUltimate(today);
            } else if (def.metricType === "TORCH_STREAK") {
                isEarned = s.maxTorchStreak > 0;
            } else if (def.metricType === "SPECIAL_WORKOUT") {
                const workoutId = def.key.replace('workout_', '').replace('_std', '');
                const userObj = allUsers.find((u: any) => u.id === s.id);
                isEarned = userObj?.specialWorkoutEntries?.some((e: any) => e.workoutId === workoutId) || false;
            }

            if (isEarned && def.isUnique) {
                const ownership = badgeOwnerships.find((bo: any) => bo.badgeKey === def.key);
                if (ownership?.currentUserId !== s.id) isEarned = false;
            }

            if (isEarned) virtualBadges[def.key] = true;
        });

        return {
            userId: s.id,
            nickname: s.nickname,
            virtualBadges
        };
    });

    const calculateScore = (s: any, def: any) => {
        const todayISO = new Date().toISOString().split('T')[0];
        const currentMonth = todayISO.substring(0, 7);

        if (def.metricType === "MAX_BONUS") return s.maxBonus || 0;
        if (def.metricType === "BONUS_STREAK") return s.maxBonusStreak || 0;
        if (def.metricType === "PERFECT_TARGET_STREAK") return s.maxPerfectStreak || 0;
        if (def.metricType === "STEAL_COUNT") return s.stealCount || 0;
        if (def.metricType === "BALANCE_RATIO") return s.balanceRatio || 0;
        if (def.metricType === "MONO_EXO_STREAK") return s.maxMonoExoStreak || 0;
        if (def.metricType === "TRI_EXO_STREAK") return s.maxTriExoStreak || 0;
        if (def.metricType === "MAX_SET") {
            if (def.exerciseScope === "PUSHUPS") return s.maxSetPushups || 0;
            if (def.exerciseScope === "PULLUPS") return s.maxSetPullups || 0;
            if (def.exerciseScope === "SQUATS") return s.maxSetSquats || 0;
            return s.maxSetAll || 0;
        }
        if (def.metricType === "SERIES_COUNT") {
            const exo = def.exerciseScope === "PUSHUPS" ? "PUSHUP" : def.exerciseScope === "PULLUPS" ? "PULLUP" : "SQUAT";
            return s.setsByTarget ? s.setsByTarget(exo, def.seriesTarget!) : 0;
        }
        if (def.metricType === "TOTAL_FINES_AMOUNT") return s.totalFinesAmount || 0;
        if (def.metricType === "TRINITY_GOLD" || def.metricType === "TRINITY_ULTIMATE") {
            return s.getDayTotal(todayISO) || 0;
        }
        if (def.metricType === "MONTH_TOTAL_EXO") {
            const exo = def.exerciseScope === "PUSHUPS" ? "PUSHUP" : def.exerciseScope === "PULLUPS" ? "PULLUP" : "SQUAT";
            return s.getMonthTotal(currentMonth, exo) || 0;
        }
        if (def.metricType === "MONTH_TOP_VOLUME") {
            return s.getMonthTotal(currentMonth) || 0;
        }
        if (def.metricType === "MONTH_TOP_SET") {
            const exo = def.exerciseScope === "PUSHUPS" ? "PUSHUP" : def.exerciseScope === "PULLUPS" ? "PULLUP" : def.exerciseScope === "PLANK" ? "PLANK" : "SQUAT";
            return s.getMonthMaxSet(currentMonth, exo) || 0;
        }
        if (def.metricType === "QUATUOR_STREAK") return s.maxQuatuorStreak || 0;
        if (def.metricType === "QUATUOR_GOLD" || def.metricType === "QUATUOR_ULTIMATE") {
            return s.getDayTotal(todayISO) || 0;
        }
        if (def.metricType === "FIRST_REACH") {
            const scopeField = def.exerciseScope === "PUSHUPS" ? "maxSetPushups" : def.exerciseScope === "PULLUPS" ? "maxSetPullups" : def.exerciseScope === "PLANK" ? "maxSetPlanks" : "maxSetSquats";
            return s[scopeField] || 0;
        }
        if (def.metricType === "FIRST_REACH_TOTAL") {
            const scopeField = def.exerciseScope === "PUSHUPS" ? "totalPushups" : def.exerciseScope === "PULLUPS" ? "totalPullups" : def.exerciseScope === "PLANK" ? "totalPlanks" : "totalSquats";
            return s[scopeField] || 0;
        }
        return 0;
    };

    // Get recent thefts to mark as "Hot"
    const recentStealEvents = allEvents.filter((e: any) => e.eventType === "STEAL"); // kept for reference
    void recentStealEvents;

    // Calculate Danger List — uses shared helper (same as Dashboard)
    const dangerList = getCompetitiveDangerList({
        badgeOwnerships,
        summaries,
        allEvents,
    });

    const serverTime = new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(new Date());

    const xpScores = await calculateAllUsersXP(allUsers, badgeOwnerships, summaries, allEvents);

    const currentUserSummary = summaries.find(s => s.id === userId);

    // Calculate Personal Records for all competitive badges
    const currentUserRecords: Record<string, number> = {};
    BADGE_DEFINITIONS.filter(d => d.type === "COMPETITIVE").forEach(def => {
        if (!currentUserSummary) return;

        currentUserRecords[def.key] = calculateScore(currentUserSummary, def);
    });

    const earnedBadgeKeys = allUsers.find((u: any) => u.id === userId)?.badges.map((b: any) => b.badgeKey) || [];
    const showcaseData = getShowcaseData(currentUserSummary, earnedBadgeKeys);

    return (
        <PantheonClient
            currentUser={allUsers.find((u: any) => u.id === userId) || { id: userId, nickname: session.user.name, image: session.user.image }}
            allUsers={allUsers}
            badgeDefinitions={BADGE_DEFINITIONS}
            badgeOwnerships={badgeOwnerships}
            recentEvents={allEvents}
            virtualizedData={virtualizedData}
            dangerList={dangerList as any}
            serverTime={serverTime}
            xpScores={xpScores}
            showcaseData={showcaseData}
            currentUserRecords={currentUserRecords}
        />
    );
}
