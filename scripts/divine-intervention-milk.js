
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TARGET_NICKNAME = 'Milkardashian';
const TARGET_DATES = ['2026-04-12', '2026-04-25', '2026-04-30'];
const UNTOUCHED_DATE = '2026-04-14';
const NEW_STATUS = 'DIVINE_INTERVENTION';

async function divineIntervention() {
    console.log(`--- DIVINE INTERVENTION START ---`);
    try {
        const user = await prisma.user.findUnique({
            where: { nickname: TARGET_NICKNAME }
        });

        if (!user) {
            console.error(`User ${TARGET_NICKNAME} not found.`);
            return;
        }

        console.log(`User found: ${user.nickname} (${user.id})`);

        // 1. Process target fines
        for (const date of TARGET_DATES) {
            const fine = await prisma.fineRecord.findUnique({
                where: { userId_date: { userId: user.id, date } }
            });

            if (fine) {
                if (fine.status === NEW_STATUS) {
                    console.log(`[IDEMPOTENT] Fine for ${date} already has status ${NEW_STATUS}.`);
                } else {
                    await prisma.fineRecord.update({
                        where: { id: fine.id },
                        data: { status: NEW_STATUS }
                    });
                    console.log(`[UPDATED] Fine for ${date} updated to ${NEW_STATUS}.`);
                }
            } else {
                console.log(`[SKIP] No fine found for ${date}. Creating one with status ${NEW_STATUS} to prevent future auto-generation.`);
                await prisma.fineRecord.create({
                    data: {
                        userId: user.id,
                        date: date,
                        amountEur: 3, // April rate
                        status: NEW_STATUS
                    }
                });
            }
        }

        // 2. Verification of untouched date
        const untouchedFine = await prisma.fineRecord.findUnique({
            where: { userId_date: { userId: user.id, date: UNTOUCHED_DATE } }
        });

        if (untouchedFine) {
            if (untouchedFine.status === 'unpaid') {
                console.log(`[VERIFIED] Fine for ${UNTOUCHED_DATE} remains 'unpaid'.`);
            } else {
                console.warn(`[WARNING] Fine for ${UNTOUCHED_DATE} has status '${untouchedFine.status}'. It should be 'unpaid'.`);
            }
        } else {
            console.log(`[INFO] No fine found for ${UNTOUCHED_DATE} (this is unexpected based on current DB state, but safe).`);
        }

    } catch (error) {
        console.error(`Error during divine intervention:`, error);
    } finally {
        await prisma.$disconnect();
        console.log(`--- DIVINE INTERVENTION END ---`);
    }
}

divineIntervention();
