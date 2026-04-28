/**
 * competitive-danger.ts
 *
 * Single source of truth for computing "Badges en Danger" (Guerre des Trônes).
 * This helper is shared between:
 * - src/app/api/dashboard/route.ts
 * - src/app/pantheon/page.tsx
 *
 * Rules:
 * - Receives already-loaded data (no DB calls).
 * - Pure computation only.
 * - Does not modify any data.
 */

import { BADGE_DEFINITIONS } from "@/config/badges";

export type CompetitiveDangerItem = {
    badgeKey: string;
    badgeName: string;
    emoji?: string;
    holder: string;
    holderImage?: string | null;
    challenger: string;
    challengerImage?: string | null;
    currentValue: number;
    challengerValue: number;
    diff: number;
    unit: string;
    isDanger: boolean;
    isRecentSteal?: boolean;
    xpAtRisk?: number;
};

type BadgeOwnership = {
    badgeKey: string;
    currentUserId: string | null;
    currentValue: number;
    locked?: boolean;
    currentUser?: { nickname: string; image?: string | null } | null;
    badge?: { name: string; emoji: string } | null;
};

type UserSummary = {
    id: string;
    nickname: string;
    image?: string | null;
    maxBonus?: number;
    maxBonusStreak?: number;
    maxPerfectStreak?: number;
    stealCount?: number;
    balanceRatio?: number;
    maxMonoExoStreak?: number;
    maxTriExoStreak?: number;
    maxSetPushups?: number;
    maxSetPullups?: number;
    maxSetSquats?: number;
    maxSetAll?: number;
    maxSetPlanks?: number;
    totalFinesAmount?: number;
    sprinterCount?: number;
    maxQuatuorStreak?: number;
    headhunterCount?: number;
    [key: string]: any;
};

/**
 * Computes the score of a summary user for a given badge definition.
 * Mirrors the logic in pantheon/page.tsx.
 */
function calculateScore(s: UserSummary, def: any): number {
    const todayISO = new Date().toISOString().split("T")[0];
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
        return s.setsByTarget ? s.setsByTarget(exo, def.seriesTarget) : 0;
    }
    if (def.metricType === "TOTAL_FINES_AMOUNT") return s.totalFinesAmount || 0;
    if (def.metricType === "TRINITY_GOLD" || def.metricType === "TRINITY_ULTIMATE") {
        return s.getDayTotal ? (s.getDayTotal(todayISO) || 0) : 0;
    }
    if (def.metricType === "MONTH_TOTAL_EXO") {
        const exo = def.exerciseScope === "PUSHUPS" ? "PUSHUP" : def.exerciseScope === "PULLUPS" ? "PULLUP" : "SQUAT";
        return s.getMonthTotal ? (s.getMonthTotal(currentMonth, exo) || 0) : 0;
    }
    if (def.metricType === "MONTH_TOP_VOLUME") {
        return s.getMonthTotal ? (s.getMonthTotal(currentMonth) || 0) : 0;
    }
    if (def.metricType === "MONTH_TOP_SET") {
        const exo = def.exerciseScope === "PUSHUPS" ? "PUSHUP" : def.exerciseScope === "PULLUPS" ? "PULLUP" : def.exerciseScope === "PLANK" ? "PLANK" : "SQUAT";
        return s.getMonthMaxSet ? (s.getMonthMaxSet(currentMonth, exo) || 0) : 0;
    }
    if (def.metricType === "QUATUOR_STREAK") return s.maxQuatuorStreak || 0;
    if (def.metricType === "QUATUOR_GOLD" || def.metricType === "QUATUOR_ULTIMATE") {
        return s.getDayTotal ? (s.getDayTotal(todayISO) || 0) : 0;
    }
    if (def.metricType === "FIRST_REACH") {
        const scopeField = def.exerciseScope === "PUSHUPS" ? "maxSetPushups" : def.exerciseScope === "PULLUPS" ? "maxSetPullups" : def.exerciseScope === "PLANK" ? "maxSetPlanks" : "maxSetSquats";
        return s[scopeField] || 0;
    }
    if (def.metricType === "FIRST_REACH_TOTAL") {
        const scopeField = def.exerciseScope === "PUSHUPS" ? "totalPushups" : def.exerciseScope === "PULLUPS" ? "totalPullups" : def.exerciseScope === "PLANK" ? "totalPlanks" : "totalSquats";
        return s[scopeField] || 0;
    }
    if (def.metricType === "HEADHUNTER_COUNT") return s.headhunterCount || 0;
    return 0;
}

/**
 * Computes the unit label for a badge definition.
 */
function resolveUnit(def: any): string {
    if (def.metricType === "SERIES_COUNT") return "Séries";
    if (def.metricType?.includes("STREAK")) return "Jours";
    if (def.metricType?.includes("VOLUME") || def.metricType?.includes("SET")) {
        return def.exerciseScope === "PLANK" ? "Secs" : "Reps";
    }
    return "Pts";
}

export type CompetitiveDangerInput = {
    badgeOwnerships: BadgeOwnership[];
    summaries: UserSummary[];
    allEvents?: any[];
    getXPForReward?: (key: string) => number;
};

/**
 * Computes the list of badges that are competitively contested.
 * Returns ALL competitive badges w/ challenger (sorted by hotness).
 * Dashboard should slice result to 3–5 items.
 */
export function getCompetitiveDangerList(input: CompetitiveDangerInput): CompetitiveDangerItem[] {
    const { badgeOwnerships, summaries, allEvents = [], getXPForReward } = input;

    const recentStealEvents = allEvents.filter((e: any) => e.eventType === "STEAL");

    const list = badgeOwnerships
        .filter((bo) => {
            const def = BADGE_DEFINITIONS.find((d) => d.key === bo.badgeKey);
            if (!def || def.type !== "COMPETITIVE" || !bo.currentUserId || bo.currentValue < 0) return false;
            if ((def.metricType as string).startsWith("DATE_COMPETITIVE")) return false;
            return true;
        })
        .map((bo) => {
            const def = BADGE_DEFINITIONS.find((d) => d.key === bo.badgeKey);
            if (!def) return null;

            // Find best challenger (excluding current holder)
            const sortedChallengers = summaries
                .filter((s) => s.id !== bo.currentUserId)
                .sort((a, b) => calculateScore(b, def) - calculateScore(a, def));

            const challenger = sortedChallengers[0];
            if (!challenger) return null;

            const challengerValue = calculateScore(challenger, def);
            const diff = bo.currentValue - challengerValue;

            const recentSteal = recentStealEvents.find((e: any) => e.badgeKey === bo.badgeKey);
            const isRecentSteal = !!(recentSteal && (new Date().getTime() - new Date(recentSteal.createdAt).getTime() < 1000 * 3600 * 24 * 3));

            const unit = resolveUnit(def);

            const isNarrowGap =
                (unit === "Séries" && diff <= 5) ||
                (unit === "Jours" && diff <= 2) ||
                (unit === "Reps" && diff <= 20) ||
                (unit === "Secs" && diff <= 30) ||
                (diff <= bo.currentValue * 0.1);

            const item: CompetitiveDangerItem = {
                badgeKey: bo.badgeKey,
                badgeName: bo.badge?.name || bo.badgeKey,
                emoji: bo.badge?.emoji,
                holder: bo.currentUser?.nickname || "?",
                holderImage: bo.currentUser?.image,
                challenger: challenger.nickname,
                challengerImage: challenger.image,
                currentValue: bo.currentValue,
                challengerValue,
                diff,
                unit,
                isDanger: isNarrowGap || isRecentSteal,
                isRecentSteal,
                xpAtRisk: getXPForReward ? getXPForReward(bo.badgeKey) : undefined,
            };

            return item;
        })
        .filter((x): x is CompetitiveDangerItem => x !== null)
        .sort((a, b) => {
            if (a.isRecentSteal && !b.isRecentSteal) return -1;
            if (!a.isRecentSteal && b.isRecentSteal) return 1;
            if (a.isDanger && !b.isDanger) return -1;
            if (!a.isDanger && b.isDanger) return 1;
            return a.diff - b.diff;
        });

    return list;
}
