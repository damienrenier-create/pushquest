/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const config = await prisma.globalConfig.findMany();
    console.log('GlobalConfig:', JSON.stringify(config, null, 2));
    const users = await prisma.user.findFirst({
        select: { nickname: true, featuredClaimsCount: true }
    });
    console.log('Sample User:', JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
