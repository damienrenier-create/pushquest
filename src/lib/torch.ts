import prisma from "./prisma";
import { getRequiredRepsForDate } from "./challenge";

export function getEffortValue(set: { exercise: string; reps: number }): number {
    if (set.exercise === "PLANK") {
        return Math.floor(set.reps / 5);
    }
    return set.reps;
}

/**
 * Checks if a torch winner already exists for the given date.
 * If not, checks if the user has reached their quota.
 * If yes, creates a persistent TORCH_CLAIM event.
 */
export async function checkAndClaimTorch(userId: string, date: string): Promise<boolean> {
    const req = getRequiredRepsForDate(date);
    if (req <= 0) return false;

    // 1. Check if a claim already exists for this date
    const existingClaim = await (prisma as any).badgeEvent.findFirst({
        where: {
            badgeKey: "torch_daily",
            eventType: "TORCH_CLAIM",
            metadata: { contains: `"${date}"` } // Assuming metadata is JSON stringified object { date: "YYYY-MM-DD" }
        }
    });

    if (existingClaim) return false;

    // 2. Calculate user progress for today
    const userSets = await (prisma as any).exerciseSet.findMany({
        where: { userId, date }
    });

    const totalEffort = userSets.reduce((sum: number, s: any) => sum + getEffortValue(s), 0);

    if (totalEffort >= req) {
        // 3. Claim the torch!
        await (prisma as any).badgeEvent.create({
            data: {
                badgeKey: "torch_daily",
                toUserId: userId,
                eventType: "TORCH_CLAIM",
                metadata: JSON.stringify({ date })
            }
        });
        return true;
    }

    return false;
}

/**
 * Gets the torch winner for a specific date from persistent events.
 */
export async function getTorchWinnerForDate(date: string) {
    const claim = await (prisma as any).badgeEvent.findFirst({
        where: {
            badgeKey: "torch_daily",
            eventType: "TORCH_CLAIM",
            metadata: { contains: `"${date}"` }
        },
        include: { toUser: { select: { id: true, nickname: true, image: true } } }
    });

    if (!claim) return null;

    return {
        userId: claim.toUser.id,
        nickname: claim.toUser.nickname,
        image: claim.toUser.image,
        achievedAt: claim.createdAt
    };
}

/**
 * Recalculates the max torch streak for a user based on persistent events.
 */
export async function computeMaxTorchStreakFromEvents(userId: string): Promise<number> {
    const allClaims = await (prisma as any).badgeEvent.findMany({
        where: {
            badgeKey: "torch_daily",
            eventType: "TORCH_CLAIM"
        },
        orderBy: { createdAt: "asc" }
    });

    const winnersByDate: Record<string, string> = {};
    allClaims.forEach((c: any) => {
        try {
            const meta = JSON.parse(c.metadata);
            if (meta.date) {
                // If multiple events exist for the same date (shouldn't happen with our logic), the first one wins
                if (!winnersByDate[meta.date]) {
                    winnersByDate[meta.date] = c.toUserId;
                }
            }
        } catch (e) {
            // Fallback to createdAt date if JSON parse fails (for legacy or broken data)
            const dateStr = c.createdAt.toISOString().split('T')[0];
            if (!winnersByDate[dateStr]) {
                winnersByDate[dateStr] = c.toUserId;
            }
        }
    });

    const sortedDates = Object.keys(winnersByDate).sort();
    let maxStreak = 0;
    let currentStreak = 0;
    let lastDate: Date | null = null;

    sortedDates.forEach(dateStr => {
        const dateObj = new Date(dateStr);
        if (winnersByDate[dateStr] === userId) {
            if (lastDate) {
                const diffMs = dateObj.getTime() - lastDate.getTime();
                const diffDays = Math.round(diffMs / (1000 * 3600 * 24));
                if (diffDays === 1) {
                    currentStreak++;
                } else {
                    currentStreak = 1;
                }
            } else {
                currentStreak = 1;
            }
            lastDate = dateObj;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else {
            currentStreak = 0;
            lastDate = null;
        }
    });

    return maxStreak;
}
