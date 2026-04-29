const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function getEffortValue(set) {
    if (set.exercise === "PLANK") {
        return Math.floor(set.reps / 5);
    }
    return set.reps;
}

function getDayOfYear(dateISO) {
    const d = new Date(dateISO);
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = (d.getTime() - start.getTime()) + ((start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

function getRequiredRepsForDate(dateISO) {
    return getDayOfYear(dateISO);
}

async function main() {
    console.log("Migrating Torch History to BadgeEvents...");

    const allSets = await prisma.exerciseSet.findMany({
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, nickname: true } } }
    });

    const setsByDate = {};
    allSets.forEach((s) => {
        if (!setsByDate[s.date]) setsByDate[s.date] = [];
        setsByDate[s.date].push(s);
    });

    const sortedDates = Object.keys(setsByDate).sort();
    let createdCount = 0;

    for (const date of sortedDates) {
        const existing = await prisma.badgeEvent.findFirst({
            where: {
                badgeKey: "torch_legacy",
                eventType: "TORCH_CLAIM",
                metadata: { contains: `"${date}"` }
            }
        });

        if (existing) {
            console.log(`Skipping ${date}, already has a claim.`);
            continue;
        }

        const daySets = setsByDate[date];
        const req = getRequiredRepsForDate(date);
        
        const userProgress = {};
        let winnerFound = false;

        for (const s of daySets) {
            userProgress[s.userId] = (userProgress[s.userId] || 0) + getEffortValue(s);
            if (userProgress[s.userId] >= req) {
                console.log(`Date ${date}: Winner is ${s.user.nickname}`);
                await prisma.badgeEvent.create({
                    data: {
                        badgeKey: "torch_legacy",
                        toUserId: s.userId,
                        eventType: "TORCH_CLAIM",
                        metadata: JSON.stringify({ date }),
                        createdAt: s.createdAt
                    }
                });
                createdCount++;
                winnerFound = true;
                break;
            }
        }

        if (!winnerFound) {
            console.log(`Date ${date}: No winner found.`);
        }
    }

    console.log(`Migration finished. Created ${createdCount} torch events.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
