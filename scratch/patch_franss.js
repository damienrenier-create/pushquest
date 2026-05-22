const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'renier.francois@gmail.com';
  
  // Update onboardingStartedAt to today's date
  const user = await prisma.user.update({
    where: { email },
    data: {
      onboardingStartedAt: new Date()
    }
  });

  console.log('User updated:', user.email, 'Onboarding Started At:', user.onboardingStartedAt);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
