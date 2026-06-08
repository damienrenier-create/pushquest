import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { calculateAllUsersXP } from '@/lib/xp';
import { getUserSummaries } from '@/lib/badges';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    // ── XP : utiliser le même calcul dynamique que le bandeau dashboard ──
    const allUsers = await prisma.user.findMany({
      where: {
        nickname: { not: 'modo' },
        isSystem: false, isGuest: false
      },
      select: {
        id: true,
        nickname: true,
        email: true,
        image: true,
        buyoutPaid: true,
        buyoutPaidAt: true,
        sets: true,
        fines: true,
        sallyUps: true,
        medicalCertificates: true,
        potEvents: true,
        xpAdjustments: true,
        league: true,
        onboardingStartedAt: true,
        createdAt: true
      }
    });

    const badgeOwnerships = await prisma.badgeOwnership.findMany({
      include: {
        badge: true,
        currentUser: { select: { nickname: true, image: true } }
      }
    });

    const allTorchAndStealEvents = await prisma.badgeEvent.findMany({
      where: { eventType: { in: ["STEAL", "TORCH_CLAIM"] } }
    });
    const sharedSummaries = getUserSummaries(allUsers, allTorchAndStealEvents);

    const xpScores = await calculateAllUsersXP(allUsers, badgeOwnerships, sharedSummaries);

    // Tri par XP décroissant
    const sorted = [...xpScores].sort(
      (a: any, b: any) => (b.totalXP ?? 0) - (a.totalXP ?? 0)
    );
    
    const currentUserScore = sorted.find((u: any) => u.id === userId);
    const xpTotal = currentUserScore?.totalXP ?? 0;
    const rank = sorted.findIndex((u: any) => u.id === userId) + 1;

    // ── Rival : la personne juste au-dessus dans le classement ──
    // Si l'utilisateur est #1, prendre le #2
    const rivalIndex = rank <= 1 ? 1 : rank - 2;
    const rivalUser = sorted[rivalIndex];
    const rivalName = (rivalUser as any)?.nickname ?? 'ton rival';

    // ── Dernière séance ──
    const lastSet = await prisma.exerciseSet.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    const exerciseMap: Record<string, string> = {
      PUSHUP: 'pompes',
      PULLUP: 'tractions',
      SQUAT: 'squats',
      PLANK: 'gainage',
    };
    const lastExercise = lastSet
      ? (exerciseMap[lastSet.exercise] ?? lastSet.exercise.toLowerCase())
      : 'pompes';
    const lastScore = lastSet?.reps ?? 0;

    const daysSince = lastSet
      ? Math.floor((Date.now() - new Date(lastSet.createdAt).getTime()) / 86400000)
      : 99;
    const lastWodDate =
      daysSince === 0 ? "aujourd'hui"
      : daysSince === 1 ? "hier"
      : `il y a ${daysSince} jours`;

    // ── Streak ──
    const recentSets = await prisma.exerciseSet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });
    let streak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    for (const s of recentSets) {
      const d = new Date(s.createdAt);
      d.setHours(0, 0, 0, 0);
      const diff = Math.floor((checkDate.getTime() - d.getTime()) / 86400000);
      if (diff <= 1) { streak++; checkDate = d; }
      else break;
    }

    return NextResponse.json({
      xpTotal,
      rivalName,
      lastWodDate,
      lastScore,
      lastExercise,
      rank,
      daysStreak: streak,
    });

  } catch (error) {
    console.error('[nexus-stats]', error);
    return NextResponse.json({
      xpTotal: 0,
      rivalName: 'ton rival',
      lastWodDate: 'récemment',
      lastScore: 0,
      lastExercise: 'pompes',
      rank: 1,
      daysStreak: 0,
    });
  }
}
