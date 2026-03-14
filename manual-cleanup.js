/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
    try {
        const result = await prisma.fineRecord.deleteMany({
            where: {
                date: { lt: "2026-03-11" },
                status: 'unpaid'
            }
        });
        console.log("Deleted fines count:", result.count);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
