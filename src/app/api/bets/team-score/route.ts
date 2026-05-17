import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const betId = searchParams.get("betId");

    if (!betId) {
      return NextResponse.json({ message: "betId requis" }, { status: 400 });
    }

    const bet = await (prisma as any).bet.findUnique({ where: { id: betId } });
    if (!bet) {
      return NextResponse.json({ message: "Pari introuvable" }, { status: 404 });
    }

    let metadata: any = {};
    try { metadata = JSON.parse(bet.metadata ?? "{}"); } catch { /* ignore */ }

    const teamConfig = metadata.teamConfig;
    if (!teamConfig) {
      return NextResponse.json({ message: "Pas de teamConfig sur ce pari" }, { status: 400 });
    }

    const { competitionStart, competitionEnd, exercise, teams } = teamConfig;

    // Récupérer les nicknames
    const allUserIds = [...teams.jaune, ...teams.rouge];
    const users = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, nickname: true },
    });
    const nicknameMap = Object.fromEntries(users.map((u: any) => [u.id, u.nickname]));

    // Sommer les reps par userId
    const sets = await (prisma as any).exerciseSet.findMany({
      where: {
        userId: { in: allUserIds },
        exercise,
        date: { gte: competitionStart, lte: competitionEnd },
      },
      select: { userId: true, reps: true },
    });

    const repsByUser: Record<string, number> = {};
    for (const s of sets) {
      repsByUser[s.userId] = (repsByUser[s.userId] ?? 0) + s.reps;
    }

    const buildTeam = (ids: string[]) => {
      const members: Record<string, number> = {};
      let total = 0;
      for (const id of ids) {
        const reps = repsByUser[id] ?? 0;
        members[nicknameMap[id] ?? id] = reps;
        total += reps;
      }
      return { total, members };
    };

    const jaune = buildTeam(teams.jaune);
    const rouge = buildTeam(teams.rouge);
    const leader = jaune.total > rouge.total ? "jaune"
      : rouge.total > jaune.total ? "rouge"
      : null;

    return NextResponse.json({ exercise, competitionStart, competitionEnd, jaune, rouge, leader });
  } catch (error) {
    console.error("GET /api/bets/team-score error:", error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
