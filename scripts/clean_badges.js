const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const monthlyKeys = [
        "month_top_volume", "month_top_pushups_set", "month_top_pullups_set", 
        "month_top_squats_set", "month_total_pushups", "month_total_pullups", "month_total_squats"
    ];

    console.log("Suppression des badges mensuels attribués aujourd'hui...");

    const events = await prisma.badgeEvent.deleteMany({
        where: {
            badgeKey: { in: monthlyKeys },
            createdAt: { gte: today }
        }
    });
    console.log(`${events.count} événements supprimés.`);

    const ownerships = await prisma.badgeOwnership.updateMany({
        where: {
            badgeKey: { in: monthlyKeys },
            achievedAt: { gte: today }
        },
        data: {
            currentUserId: null,
            currentValue: 0,
            achievedAt: null
        }
    });
    console.log(`${ownerships.count} ownerships réinitialisés.`);
    
    await prisma.$disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
