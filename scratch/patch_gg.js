const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const nickname = 'Gg';
  
  const user = await prisma.user.findFirst({ where: { nickname } });
  if (user) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingStartedAt: user.createdAt
      }
    });
    console.log('Fixed user:', updated.nickname, 'Onboarding Started At:', updated.onboardingStartedAt);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
