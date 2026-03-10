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

    // Calculate virtual milestones for everyone
    const virtualizedData = summaries.map((s: any) => {
        return {
            userId: s.id,
            nickname: s.nickname,
            virtualBadges: {
                centurion: s.maxSetAll >= 100,
                general_10k: s.totalAll >= 10000,
                survivor_30d: s.fineFreeStreak >= 30,
                early_bird: s.earlyStreak >= 1,
                night_owl: s.lateStreak >= 1,
                high_noon: s.noonStreak >= 1,
                master_thief: s.stealCount > 0
            }
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

    const xpScores = calculateAllUsersXP(allUsers, badgeOwnerships);

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
