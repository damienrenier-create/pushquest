const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const users = [
            { nickname: 'Mools', image: '/avatars/mools.png' },
            { nickname: 'Neuneu', image: '/avatars/neuneu.png' },
            { nickname: 'Xa', image: '/avatars/xa.png' }
        ];

        for (const user of users) {
            await prisma.user.update({
                where: { nickname: user.nickname },
                data: { image: user.image }
            });
            console.log(`Updated ${user.nickname}`);
        }
        console.log('All profiles updated successfully');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
