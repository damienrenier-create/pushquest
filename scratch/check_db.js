const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.user.count();
        console.log('User count:', count);
        
        const firstUsers = await prisma.user.findMany({ take: 5, select: { nickname: true, league: true } });
        console.log('Sample users:', firstUsers);
        
        const leagues = await prisma.user.groupBy({ by: ['league'], _count: { id: true } });
        console.log('Leagues distribution:', leagues);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
