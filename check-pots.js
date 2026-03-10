const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const paidFines = await prisma.fineRecord.findMany({ where: { status: 'paid' } });
        const potEvents = await prisma.potEvent.findMany();
        console.log("Paid Fines Count:", paidFines.length);
        console.log("Pot Events Count:", potEvents.length);
        
        const allFines = await prisma.fineRecord.findMany({ include: { user: true } });
        console.log("Remaining Fines:", allFines.map(f => `${f.user.nickname}: ${f.date} (${f.status})`).join(', '));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
