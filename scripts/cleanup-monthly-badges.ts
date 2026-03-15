import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanup() {
    console.log("Starting cleanup of monthly badges awarded today...");
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthlyBadgeKeys = [
        "month_top_volume",
        "month_top_pushups_set",
        "month_top_pullups_set",
        "month_top_squats_set",
        "month_total_pushups",
        "month_total_pullups",
        "month_total_squats"
    ];

    try {
        // 1. Delete BadgeEvents created today for these badges
        const deletedEvents = await (prisma as any).badgeEvent.deleteMany({
            where: {
                badgeKey: { in: monthlyBadgeKeys },
                createdAt: { gte: today }
            }
        });
        console.log(`Deleted ${deletedEvents.count} BadgeEvent records.`);

        // 2. Delete BadgeOwnership records created today for these badges (or reset them)
        // Note: achievedAt for the badges awarded today would be today.
        const deletedOwnerships = await (prisma as any).badgeOwnership.deleteMany({
            where: {
                badgeKey: { in: monthlyBadgeKeys },
                achievedAt: { gte: today }
            }
        });
        console.log(`Deleted ${deletedOwnerships.count} BadgeOwnership records.`);

        console.log("Cleanup completed successfully.");
    } catch (error) {
        console.error("Error during cleanup:", error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
