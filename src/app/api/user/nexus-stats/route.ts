import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;

    // Dernière séance
    const lastSet = await prisma.exerciseSet.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Calcul du meilleur exercice de la dernière séance
    let lastExercise = 'pompes';
    let lastScore = 0;
    if (lastSet) {
      lastScore = lastSet.reps;
      const exoMap: Record<string, string> = {
        'PUSHUP': 'pompes',
        'PULLUP': 'tractions',
        'SQUAT': 'squats',
        'PLANK': 'gainage'
      };
      lastExercise = exoMap[lastSet.exercise] || 'pompes';
    }

    // Date lisible
    const daysSince = lastSet
      ? Math.floor((Date.now() - lastSet.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 99;
    const lastWodDate =
      daysSince === 0 ? "aujourd'hui"
      : daysSince === 1 ? "hier"
      : `il y a ${daysSince} jours`;

    // Tous les users pour le ranking
    const allUsers = await prisma.user.findMany({
      select: { id: true, nickname: true }
    });

    // XP total via les ExerciseSets (somme de tous les scores)
    const userSets = await prisma.exerciseSet.findMany({ where: { userId } });
    const xpTotal = userSets.reduce((acc: number, s: any) => {
      return acc + s.reps;
    }, 0);

    // Streak (jours consécutifs)
    const recentSets = await prisma.exerciseSet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30
    });
    let streak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    for (const set of recentSets) {
      const setDate = new Date(set.createdAt);
      setDate.setHours(0, 0, 0, 0);
      const diff = Math.floor((checkDate.getTime() - setDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 1) { streak++; checkDate = setDate; }
      else break;
    }

    // Rival : user le plus proche au classement
    const allXP = await Promise.all(
      allUsers.filter((u: any) => u.id !== userId).map(async (u: any) => {
        const sets = await prisma.exerciseSet.findMany({ where: { userId: u.id } });
        const xp = sets.reduce((acc: number, s: any) => acc + s.reps, 0);
        return { id: u.id, name: u.nickname ?? 'Inconnu', xp };
      })
    );

    const sorted = [...allXP, { id: userId, name: '', xp: xpTotal }]
      .sort((a: any, b: any) => b.xp - a.xp);
    const rank = sorted.findIndex((u: any) => u.id === userId) + 1;
    const rival = allXP.sort((a: any, b: any) => Math.abs(a.xp - xpTotal) - Math.abs(b.xp - xpTotal))[0];
    const rivalName = rival?.name ?? 'ton rival';

    return NextResponse.json({
      xpTotal,
      rivalName,
      lastWodDate,
      lastScore,
      lastExercise,
      rank,
      daysStreak: streak
    });

  } catch (error) {
    console.error('nexus-stats error:', error);
    // Fallback gracieux — ne jamais bloquer le Nexus
    return NextResponse.json({
      xpTotal: 0,
      rivalName: 'ton rival',
      lastWodDate: 'récemment',
      lastScore: 0,
      lastExercise: 'pompes',
      rank: 1,
      daysStreak: 0
    });
  }
}
