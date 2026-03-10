const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const fines = await prisma.fineRecord.findMany({
            where: { status: 'unpaid' },
            include: { user: true }
        });
        console.log("Unpaid Fines Count:", fines.length);
        fines.forEach(f => {
            console.log(`User: ${f.user.nickname}, Date: ${f.date}, Amount: ${f.amountEur}, League: ${f.user.league}`);
        });

        const users = await prisma.user.findMany({
            select: { nickname: true, league: true }
        });
        console.log("All Users:", users.map(u => `${u.nickname} (${u.league})`).join(', '));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
