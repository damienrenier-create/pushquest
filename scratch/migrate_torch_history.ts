import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Simplified version of the logic to match our new standard
function getEffortValue(set: any): number {
    if (set.exercise === "PLANK") {
        return Math.floor(set.reps / 5);
    }
    return set.reps;
}

function getDayOfYear(dateISO: string): number {
    const d = new Date(dateISO);
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = (d.getTime() - start.getTime()) + ((start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

function getRequiredRepsForDate(dateISO: string): number {
    return getDayOfYear(dateISO);
}

async function main() {
    console.log("Migrating Torch History to BadgeEvents...");

    // 1. Fetch all sets
    const allSets = await (prisma as any).exerciseSet.findMany({
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, nickname: true } } }
    });

    // 2. Group by date
    const setsByDate: Record<string, any[]> = {};
    allSets.forEach((s: any) => {
        if (!setsByDate[s.date]) setsByDate[s.date] = [];
        setsByDate[s.date].push(s);
    });

    const sortedDates = Object.keys(setsByDate).sort();
    let createdCount = 0;

    for (const date of sortedDates) {
        // Check if event already exists
        const existing = await (prisma as any).badgeEvent.findFirst({
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
        
        const userProgress: Record<string, number> = {};
        let winnerFound = false;

        for (const s of daySets) {
            userProgress[s.userId] = (userProgress[s.userId] || 0) + getEffortValue(s);
            if (userProgress[s.userId] >= req) {
                console.log(`Date ${date}: Winner is ${s.user.nickname}`);
                await (prisma as any).badgeEvent.create({
                    data: {
                        badgeKey: "torch_legacy",
                        toUserId: s.userId,
                        eventType: "TORCH_CLAIM",
                        metadata: JSON.stringify({ date }),
                        createdAt: s.createdAt // Use the original timestamp for the event
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
