
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const nickname = 'Milkardashian';
  const user = await prisma.user.findFirst({
    where: { nickname: { equals: nickname, mode: 'insensitive' } },
    include: {
      medicalCertificates: true,
      fines: true,
    }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('--- USER INFO ---');
  console.log('ID:', user.id);
  console.log('Nickname:', user.nickname);
  console.log('Onboarding Started:', user.onboardingStartedAt);
  console.log('Buyout Paid At:', user.buyoutPaidAt);
  console.log('Created At:', user.createdAt);

  const dates = ['2026-04-12', '2026-04-14', '2026-04-25', '2026-04-30'];
  
  function getDayOfYear(dateISO: string): number {
    const d = new Date(dateISO);
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = (d.getTime() - start.getTime()) + ((start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  function calculateOnboardingQuota(startDateISO: string, targetDateISO: string): number {
    const start = new Date(startDateISO);
    const target = new Date(targetDateISO);
    if (target < start) return 30;
    start.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    let quota = 30;
    for (let i = 0; i < diffDays; i++) {
        const current = new Date(start);
        current.setDate(current.getDate() + i + 1);
        const dayOfWeek = current.getDay();
        quota += (dayOfWeek === 0 ? 2 : 3);
    }
    return quota;
  }

  function getDailyTarget(user: any, dateISO: string): number {
    const standard = getDayOfYear(dateISO);
    if (!user.onboardingStartedAt) return standard;
    const startISO = new Date(user.onboardingStartedAt).toISOString().split('T')[0];
    const onboarding = calculateOnboardingQuota(startISO, dateISO);
    return Math.min(onboarding, standard);
  }

  console.log('\n--- TARGETS AND STATUS ---');
  dates.forEach(d => {
    const target = getDailyTarget(user, d);
    const daySets = sets.filter(s => s.date === d);
    const total = daySets.reduce((sum, s) => sum + (s.exercise === 'PLANK' ? Math.floor(s.reps / 5) : s.reps), 0);
    const isValid = total >= target;
    console.log(`Date: ${d} | Target: ${target} | Total: ${total} | Valid: ${isValid}`);
  });

  // Extended dates for nearby check
  const allSearchDates = ['2026-04-11', '2026-04-12', '2026-04-13', '2026-04-14', '2026-04-15', '2026-04-24', '2026-04-25', '2026-04-26', '2026-04-29', '2026-04-30', '2026-05-01'];

  const sets = await prisma.exerciseSet.findMany({
    where: {
      userId: user.id,
      date: { in: allSearchDates }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log('\n--- EXERCISE SETS ---');
  sets.forEach(s => {
    console.log(`Date: ${s.date} | Exo: ${s.exercise} | Reps: ${s.reps} | CreatedAt: ${s.createdAt.toISOString()}`);
  });

  console.log('\n--- FINES ---');
  user.fines.forEach(f => {
    if (dates.includes(f.date)) {
      console.log(`Date: ${f.date} | Amount: ${f.amountEur}€ | Status: ${f.status}`);
    }
  });

  console.log('\n--- MEDICAL CERTIFICATES ---');
  user.medicalCertificates.forEach(c => {
    console.log(`Start: ${c.startDateISO} | End: ${c.endDateISO} | Note: ${c.note}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
