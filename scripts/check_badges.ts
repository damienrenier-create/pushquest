import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkBadges() {
    const keys = ["trinity_gold", "trinity_ultimate", "trinity"];
    console.log("Checking BadgeOwnership for:", keys);

    const ownerships = await prisma.badgeOwnership.findMany({
        where: { badgeKey: { in: keys } },
        include: { currentUser: true }
    });

    ownerships.forEach(o => {
        console.log(`Badge: ${o.badgeKey}`);
        console.log(`  Holder: ${o.currentUser?.nickname || "NONE"}`);
        console.log(`  Achieved At: ${o.achievedAt}`);
        console.log(`  Value: ${o.currentValue}`);
    });

    // Also check BadgeEvents to see who had it and what happened
    const events = await prisma.badgeEvent.findMany({
        where: { badgeKey: { in: keys } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { fromUser: true, toUser: true }
    });

    console.log("\nRecent Events for these badges:");
    events.forEach(e => {
        console.log(`[${e.createdAt.toISOString()}] ${e.badgeKey}: ${e.eventType} from ${e.fromUser?.nickname || "SYSTEM"} to ${e.toUser?.nickname || "NONE"} (Value: ${e.newValue})`);
    });

    await prisma.$disconnect();
}

checkBadges();
