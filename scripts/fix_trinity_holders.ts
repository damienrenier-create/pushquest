import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixTrinity() {
    console.log("🛠️ Restoring Trinity Champions...");

    // 1. Find Users
    const xa = await prisma.user.findFirst({ where: { nickname: "Xa" } });
    const mools = await prisma.user.findFirst({ where: { nickname: "Mools" } });

    if (!xa || !mools) {
        console.error("❌ Xa or Mools not found!");
        return;
    }

    // 2. Restore Trinity Gold (Xa - 1590 reps on March 19)
    await (prisma as any).badgeOwnership.upsert({
        where: { badgeKey: "trinity_gold" },
        update: { currentUserId: xa.id, currentValue: 1590, updatedAt: new Date("2026-03-19") },
        create: { badgeKey: "trinity_gold", currentUserId: xa.id, currentValue: 1590, updatedAt: new Date("2026-03-19") }
    });
    console.log("✅ Trinity Gold restored to Xa");

    // 3. Restore Trinity Ultimate (Mools - 250 reps/exo base on March 14)
    await (prisma as any).badgeOwnership.upsert({
        where: { badgeKey: "trinity_ultimate" },
        update: { currentUserId: mools.id, currentValue: 250, updatedAt: new Date("2026-03-14") },
        create: { badgeKey: "trinity_ultimate", currentUserId: mools.id, currentValue: 250, updatedAt: new Date("2026-03-14") }
    });
    console.log("✅ Trinity Ultimate restored to Mools");

    console.log("🚀 Done! Pantheon is back to glory.");
}

fixTrinity()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
