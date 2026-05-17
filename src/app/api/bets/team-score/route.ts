import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ─── GET /api/bets/team-score?betId=... ──────────────────────────────────────
// Calcule les scores d'équipe en temps réel depuis les ExerciseSets.
// Pas d'auth requise — données publiques de compétition.

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const betId = searchParams.get("betId");

    if (!betId) {
      return NextResponse.json({ message: "betId requis" }, { status: 400 });
    }

    // Charger le pari
    const bet = await (prisma as any).bet.findUnique({
      where: { id: betId },
      select: { id: true, title: true, metadata: true, status: true },
    });

    if (!bet) {
      return NextResponse.json({ message: "Pari introuvable" }, { status: 404 });
    }

    // Parser le metadata
    const metadata = (() => {
      try { return JSON.parse(bet.metadata || "{}"); } catch { return {}; }
    })();

    const teamConfig = metadata.teamConfig;
    if (!teamConfig || !teamConfig.exercise || !teamConfig.teams || !teamConfig.competitionStart || !teamConfig.competitionEnd) {
      return NextResponse.json({ message: "Ce pari ne possède pas de teamConfig valide" }, { status: 400 });
    }

    const { exercise, teams, competitionStart, competitionEnd } = teamConfig;

    // Récupérer les nicknames des joueurs
    const allUserIds = [...teams.jaune, ...teams.rouge];
    const users = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, nickname: true },
    });
    const userMap = new Map(users.map((u: any) => [u.id, u.nickname]));

    // Sommer les reps par userId sur la période de compétition
    const sets = await (prisma as any).exerciseSet.findMany({
      where: {
        userId: { in: allUserIds },
        exercise: exercise,
        date: {
          gte: competitionStart,
          lte: competitionEnd,
        },
      },
      select: { userId: true, reps: true, date: true },
    });

    // Agréger par userId
    const repsByUser: Record<string, number> = {};
    for (const s of sets) {
      repsByUser[s.userId] = (repsByUser[s.userId] || 0) + s.reps;
    }

    // Construire les totaux par équipe
    const buildTeamStats = (userIds: string[]) => {
      const members: Record<string, number> = {};
      let total = 0;
      for (const uid of userIds) {
        const reps = repsByUser[uid] || 0;
        const nickname = (userMap.get(uid) as string) || uid;
        members[nickname] = reps;
        total += reps;
      }
      return { total, members };
    };

    const jauneStats = buildTeamStats(teams.jaune);
    const rougeStats = buildTeamStats(teams.rouge);

    let leader: "jaune" | "rouge" | "tied" | null = null;
    if (jauneStats.total > rougeStats.total) leader = "jaune";
    else if (rougeStats.total > jauneStats.total) leader = "rouge";
    else if (jauneStats.total === rougeStats.total && jauneStats.total > 0) leader = "tied";

    return NextResponse.json({
      betId,
      betTitle: bet.title,
      exercise,
      competitionStart,
      competitionEnd,
      jaune: jauneStats,
      rouge: rougeStats,
      leader,
      unit: exercise === "PLANK" ? "s" : "reps",
    });

  } catch (error) {
    console.error("GET /api/bets/team-score error:", error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
