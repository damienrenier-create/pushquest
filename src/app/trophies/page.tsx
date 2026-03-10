import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BADGE_DEFINITIONS } from "@/config/badges";
import TrophiesClient from "./TrophiesClient";

export default async function TrophiesPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const userId = session.user.id;

    // Fetch all needed data for social hub + personal trophies
    const [sets, allUsers, badgeOwnerships, recentEvents] = await Promise.all([
        prisma.exerciseSet.findMany({ where: { userId } }),
        prisma.user.findMany({
            where: { nickname: { not: 'modo' } },
            include: { sets: true }
        }),
        prisma.badgeOwnership.findMany({
            include: {
                badge: true,
                currentUser: { select: { nickname: true } }
            }
        }),
        prisma.badgeEvent.findMany({
            take: 20,
            orderBy: { createdAt: "desc" },
            include: {
                badge: true,
                fromUser: { select: { nickname: true } },
                toUser: { select: { nickname: true } }
            }
        })
    ]);

    // Calculate personal stats
    const stats = {
        totalPushups: sets.filter(s => s.exercise === "PUSHUP").reduce((acc, s) => acc + s.reps, 0),
        totalPullups: sets.filter(s => s.exercise === "PULLUP").reduce((acc, s) => acc + s.reps, 0),
        totalSquats: sets.filter(s => s.exercise === "SQUAT").reduce((acc, s) => acc + s.reps, 0),
        totalAll: sets.reduce((acc, s) => acc + s.reps, 0),
        maxSetAll: sets.length > 0 ? Math.max(...sets.map(s => s.reps)) : 0,
    };

    const earnedBadges = badgeOwnerships
        .filter(bo => bo.currentUserId === userId)
        .map(bo => bo.badgeKey);

    // Calculate Leaderboard (simplified for Danger List logic)
    const leaderboard = allUsers.map(u => {
        const uSets = (u as any).sets || [];
        const totalPushups = uSets.filter((s: any) => s.exercise === "PUSHUP").reduce((sum: number, s: any) => sum + s.reps, 0);
        const totalPullups = uSets.filter((s: any) => s.exercise === "PULLUP").reduce((sum: number, s: any) => sum + s.reps, 0);
        const totalSquats = uSets.filter((s: any) => s.exercise === "SQUAT").reduce((sum: number, s: any) => sum + s.reps, 0);

        return {
            id: u.id,
            nickname: u.nickname,
            totalPushups,
            totalPullups,
            totalSquats,
            totalAll: totalPushups + totalPullups + totalSquats,
            maxSingleSet: Math.max(0, ...uSets.map((s: any) => s.reps)),
            sets: uSets
        };
    });

    // Danger List Calculation
    const dangerList: any[] = [];
    badgeOwnerships.forEach((bo: any) => {
        if (!bo.currentUserId || bo.locked) return;
        const def = bo.badge;
        let challenger: any = null;
        let challengerValue = 0;

        leaderboard.forEach(u => {
            if (u.id === bo.currentUserId) return;
            let val = 0;
            const uSets = (u as any).sets || [];

            if (def.metricType === "MAX_SET") {
                if (def.exerciseScope === "PUSHUPS") val = Math.max(0, ...uSets.filter((s: any) => s.exercise === "PUSHUP").map((s: any) => s.reps));
                else if (def.exerciseScope === "PULLUPS") val = Math.max(0, ...uSets.filter((s: any) => s.exercise === "PULLUP").map((s: any) => s.reps));
                else if (def.exerciseScope === "SQUATS") val = Math.max(0, ...uSets.filter((s: any) => s.exercise === "SQUAT").map((s: any) => s.reps));
                else val = u.maxSingleSet;
            } else if (def.metricType === "SERIES_COUNT") {
                const exo = def.exerciseScope === "PUSHUPS" ? "PUSHUP" : def.exerciseScope === "PULLUPS" ? "PULLUP" : "SQUAT";
                val = uSets.filter((s: any) => s.exercise === exo && s.reps === def.seriesTarget).length;
            }

            if (val > challengerValue) {
                challengerValue = val;
                challenger = u;
            }
        });

        if (challenger && bo.currentValue > 0) {
            const diff = bo.currentValue - challengerValue;
            if (challengerValue / bo.currentValue >= 0.9 || diff <= 2) {
                dangerList.push({
                    badgeKey: bo.badgeKey,
                    badgeName: bo.badge.name,
                    emoji: bo.badge.emoji,
                    holder: bo.currentUser?.nickname,
                    challenger: challenger.nickname,
                    currentValue: bo.currentValue,
                    challengerValue,
                    diff
                });
            }
        }
    });

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-12 pb-20">
            <header className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="text-center sm:text-left">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase italic">
                        Le Panthéon <span className="text-indigo-500">Global</span>
                    </h1>
                    <p className="mt-2 text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                        Exploits mondiaux, activités récentes et ta progression personnelle.
                    </p>
                </div>
                <Link
                    href="/"
                    className="w-full sm:w-auto px-6 py-3 text-xs font-black uppercase tracking-widest text-white bg-slate-800 rounded-2xl hover:bg-slate-700 transition-all border border-slate-700 shadow-xl text-center"
                >
                    ← Dashboard
                </Link>
            </header>

            <TrophiesClient
                earnedBadges={earnedBadges}
                badgeDefinitions={BADGE_DEFINITIONS as any}
                userStats={stats}
                recentEvents={recentEvents as any}
                dangerList={dangerList}
                badgeOwnerships={badgeOwnerships as any}
            />
        </div>
    );
}
