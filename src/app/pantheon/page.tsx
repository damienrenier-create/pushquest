import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import PantheonClient from "@/app/pantheon/PantheonClient";
import { getUserSummaries } from "@/lib/badges";
import { BADGE_DEFINITIONS } from "@/config/badges";
import { getRequiredRepsForDate } from "@/lib/challenge";
import { calculateAllUsersXP } from "@/lib/xp";

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
                nickname: { not: 'modo' },
                league: league
            },
            include: {
                sets: true,
                fines: true,
                badges: true,
                xpAdjustments: true
            }
        }),
        (prisma as any).badgeOwnership.findMany({
            where: {
                currentUser: { league: league }
            },
            include: {
                currentUser: true,
                badge: true,
            }
        }),
        (prisma as any).badgeEvent.findMany({
            where: {
                toUser: { league: league }
            },
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
                const exo = def.exerciseScope === "PUSHUPS" ? "PUSHUP" : "SQUAT";
                isEarned = s.getHistoricalMaxVolume(days, exo) >= threshold;
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

    // Calculate Danger List (Badges close to being stolen)
    const dangerList = badgeOwnerships
        .filter((bo: any) => {
            const def = BADGE_DEFINITIONS.find(d => d.key === bo.badgeKey);
            return def && def.type === "COMPETITIVE" && bo.currentUserId && bo.currentValue >= 0;
        })
        .map((bo: any) => {
            const def = BADGE_DEFINITIONS.find(d => d.key === bo.badgeKey);
            if (!def) return null;

            // Calculate exact score for comparison
            const getScore = (s: any) => {
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
                return 0;
            };

            // Find best challenger (excluding current holder)
            const sortedChallengers = summaries
                .filter(s => s.id !== bo.currentUserId)
                .sort((a: any, b: any) => getScore(b) - getScore(a));

            const challenger = sortedChallengers[0] as any;
            if (!challenger) return null;

            const challengerValue = getScore(challenger);
            const diff = bo.currentValue - challengerValue;

            // Show if it's a competitive badge and we have a valid challenger
            if (challenger) {
                return {
                    badgeKey: bo.badgeKey,
                    badgeName: bo.badge?.name,
                    emoji: bo.badge?.emoji,
                    holder: bo.currentUser?.nickname,
                    challenger: challenger.nickname,
                    currentValue: bo.currentValue,
                    challengerValue,
                    diff
                };
            }
            return null;
        })
        .filter(Boolean);

    const serverTime = new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(new Date());

    const xpScores = await calculateAllUsersXP(allUsers, badgeOwnerships, summaries, allEvents);

    return (
        <PantheonClient
            currentUser={allUsers.find((u: any) => u.id === userId)}
            allUsers={allUsers.map((u: any) => ({ id: u.id, nickname: u.nickname }))}
            badgeDefinitions={BADGE_DEFINITIONS}
            badgeOwnerships={badgeOwnerships}
            recentEvents={allEvents}
            virtualizedData={virtualizedData}
            dangerList={dangerList as any}
            serverTime={serverTime}
            xpScores={xpScores}
        />
    );
}
