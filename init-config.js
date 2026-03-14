/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simulation of rotateFeaturedBadge logic to be safe
async function initialize() {
  try {
    console.log('Starting manual initialization...');
    
    // Check if table exists
    const config = await prisma.globalConfig.findMany();
    console.log('Current config:', config);

    const badges = [
        "big_flexer", "regular_flexer", "perfect_soldier", "king_of_set_all",
        "king_of_set_pushups", "king_of_set_pullups", "king_of_set_squats"
    ]; // Common badges
    const randomBadge = badges[Math.floor(Math.random() * badges.length)];

    await prisma.globalConfig.upsert({
      where: { key: "featuredBadgeKey" },
      update: { value: randomBadge, updatedAt: new Date() },
      create: { key: "featuredBadgeKey", value: randomBadge }
    });

    await prisma.globalConfig.upsert({
        where: { key: "featuredBadgeRotation" },
        update: { value: new Date().toISOString(), updatedAt: new Date() },
        create: { key: "featuredBadgeRotation", value: new Date().toISOString() }
      });

    console.log('Initialization complete. Featured Badge:', randomBadge);
  } catch (e) {
    console.error('Initialization Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

initialize();
