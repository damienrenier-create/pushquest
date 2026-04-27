const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function fixTrinity() {
    console.log("🛠️ Restoring Trinity Champions (JS)...");

    try {
        // 1. Find Users
        const users = await prisma.user.findMany({
            where: { nickname: { in: ["Xa", "Mools"] } }
        });

        const xa = users.find(u => u.nickname === "Xa");
        const mools = users.find(u => u.nickname === "Mools");

        if (!xa || !mools) {
            console.error("❌ Xa or Mools not found! (Found:", users.map(u => u.nickname).join(", "), ")");
            return;
        }

        // 2. Restore Trinity Gold (Xa - 1590 reps on March 19)
        // Note: Prisma might not have 'badgeOwnership' in TS types if not generated, but it exists in DB
        await prisma.badgeOwnership.upsert({
            where: { badgeKey: "trinity_gold" },
            update: { currentUserId: xa.id, currentValue: 1590, updatedAt: new Date("2026-03-19") },
            create: { badgeKey: "trinity_gold", currentUserId: xa.id, currentValue: 1590, updatedAt: new Date("2026-03-19") }
        });
        console.log("✅ Trinity Gold restored to Xa");

        // 3. Restore Trinity Ultimate (Mools - 250 reps/exo base on March 14)
        await prisma.badgeOwnership.upsert({
            where: { badgeKey: "trinity_ultimate" },
            update: { currentUserId: mools.id, currentValue: 250, updatedAt: new Date("2026-03-14") },
            create: { badgeKey: "trinity_ultimate", currentUserId: mools.id, currentValue: 250, updatedAt: new Date("2026-03-14") }
        });
        console.log("✅ Trinity Ultimate restored to Mools");

        console.log("🚀 Done! Pantheon is back to glory.");
    } catch (err) {
        console.error("❌ Fix Error:", err);
    } finally {
        await prisma.$disconnect();
    }
}

fixTrinity();
