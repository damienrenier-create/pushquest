
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const user = await prisma.user.findUnique({
            where: { nickname: 'Milkardashian' }
        });
        console.log("USER:", JSON.stringify(user, null, 2));
        
        if (user) {
            const fines = await prisma.fineRecord.findMany({
                where: { 
                    userId: user.id,
                    date: { in: ['2026-04-12', '2026-04-14', '2026-04-25', '2026-04-30'] }
                },
                orderBy: { date: 'asc' }
            });
            console.log("FINES:", JSON.stringify(fines, null, 2));
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
