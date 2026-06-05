import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getTodayISO } from "@/lib/challenge";
import { overshootPointsForUser, datesInRange } from "@/lib/overshoot";

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

    // ─── MODE DÉPASSEMENT DE QUOTA (Verts vs Bleus) ──────────────────────────
    if (teamConfig.metric === "QUOTA_OVERSHOOT") {
      const teamKeys = Object.keys(teams); // ex: ["vert", "bleu"]
      const allUserIds = teamKeys.flatMap((k) => teams[k]);

      // Borne haute = min(fin de compète, aujourd'hui) pour un score live
      const today = getTodayISO();
      const endClamp = today < competitionEnd ? today : competitionEnd;
      const dates = competitionStart <= endClamp ? datesInRange(competitionStart, endClamp) : [];

      const users = await prisma.user.findMany({
        where: { id: { in: allUserIds } },
        select: { id: true, nickname: true, onboardingStartedAt: true },
      });
      const userMap = Object.fromEntries(users.map((u: any) => [u.id, u]));

      const sets = await (prisma as any).exerciseSet.findMany({
        where: {
          userId: { in: allUserIds },
          date: { gte: competitionStart, lte: endClamp },
        },
        select: { userId: true, date: true, exercise: true, reps: true, offeredToUserId: true },
      });
      const setsByUser: Record<string, any[]> = {};
      for (const s of sets) (setsByUser[s.userId] ??= []).push(s);

      const buildTeam = (ids: string[]) => {
        const members: Record<string, number> = {};
        let total = 0;
        for (const id of ids) {
          const u = userMap[id];
          const pts = u ? overshootPointsForUser(u, setsByUser[id] ?? [], dates) : 0;
          members[u?.nickname ?? id] = pts;
          total += pts;
        }
        return { total, members };
      };

      const teamResults: Record<string, { total: number; members: Record<string, number> }> = {};
      for (const k of teamKeys) teamResults[k] = buildTeam(teams[k]);

      const [kA, kB] = teamKeys;
      const leader = teamResults[kA].total > teamResults[kB].total ? kA
        : teamResults[kB].total > teamResults[kA].total ? kB
        : null;

      return NextResponse.json({
        mode: "overshoot",
        competitionStart,
        competitionEnd,
        teams: teamResults,
        display: teamConfig.display ?? {},
        leader,
      });
    }

    // ─── MODE VOLUME (Semaine des Équipes Jaune/Rouge — inchangé) ─────────────
    const allUserIds = [...teams.jaune, ...teams.rouge];
    const users = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, nickname: true },
    });
    const nicknameMap = Object.fromEntries(users.map((u: any) => [u.id, u.nickname]));

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
