import { PrismaClient } from "@prisma/client";
import { getUserSummaries } from "../src/lib/badges";
import { calculateDailyXPGainForUser } from "../src/lib/xp";

const prisma = new PrismaClient();

async function audit() {
    const yesterday = "2026-04-26";
    console.log(`--- Audit XP for ${yesterday} ---`);

    const users = await prisma.user.findMany({
        include: {
            sets: true,
            fines: true,
            badges: true,
            xpAdjustments: true,
            sallyUps: true
        }
    });

    const allEvents = await prisma.badgeEvent.findMany({
        include: { badge: true, fromUser: true, toUser: true }
    });

    const summaries = getUserSummaries(users, allEvents);
    const badgesOwnerships = await prisma.badgeOwnership.findMany({
        include: { badge: true, currentUser: true }
    });

    const targets = ["Neuneu", "Xa"];

    for (const nickname of targets) {
        const user = users.find(u => u.nickname.toLowerCase() === nickname.toLowerCase());
        if (!user) {
            console.log(`User ${nickname} not found.`);
            continue;
        }

        const report = calculateDailyXPGainForUser(
            user,
            yesterday,
            summaries,
            badgesOwnerships,
            { maxVolDayUser: null, maxVolMonthUser: null, maxVolYearUser: null } // Records not relevant for daily fixed gains
        );

        console.log(`\nResults for ${user.nickname}:`);
        console.log(`Total XP: ${report?.total}`);
        console.log(`- Reps XP: ${report?.repsXP}`);
        console.log(`- Regularity XP: ${report?.regularityXP}`);
        console.log(`- Badges XP: ${report?.badgesXP}`);
        console.log(`- Manual XP: ${report?.manualXP}`);

        if (report && report.badgesDetail && report.badgesDetail.length > 0) {
            console.log("Badges Detail:");
            report.badgesDetail.forEach((b: any) => {
                console.log(`  * ${b.emoji} ${b.name}: +${b.xp} XP`);
            });
        }

        const setsYesterday = user.sets.filter((s: any) => s.date === yesterday);
        const totalReps = setsYesterday.reduce((acc, s) => acc + s.reps, 0);
        console.log(`Total Reps Yesterday: ${totalReps}`);
        setsYesterday.forEach(s => {
            console.log(`  ${s.exercise}: ${s.reps} reps (at ${s.createdAt})`);
        });
    }

    await prisma.$disconnect();
}

audit();
