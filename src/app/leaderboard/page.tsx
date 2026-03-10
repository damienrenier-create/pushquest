import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { calculateAllUsersXP } from "@/lib/xp";

export default async function LeaderboardPage({
    searchParams,
}: {
    searchParams: Promise<{ exercise?: string }>;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const { exercise = "XP" } = await searchParams;
    const selectedExercise = (exercise as string).toUpperCase();
    const league = (session.user as any).league || "POMPES";

    let leaderboard: any[] = [];
    let totalGroupReps = 0;

    if (selectedExercise === "XP") {
        const allUsers = await (prisma.user as any).findMany({
            where: {
                nickname: { not: 'modo' },
                league: league
            },
            include: { sets: true, xpAdjustments: true } // FORCE TO GET NICKNAME
        });
        const badgeOwnerships = await (prisma as any).badgeOwnership.findMany();
        const xpScores = calculateAllUsersXP(allUsers, badgeOwnerships);

        // Find max XP to scale the bar correctly if percentage is not wanted
        const maxXP = xpScores.length > 0 ? xpScores[0].totalXP : 1;

        totalGroupReps = xpScores.reduce((sum, entry) => sum + entry.totalXP, 0);
        leaderboard = xpScores.map((x: any) => {
            // Re-bind the nickname safely from the allUsers array in case it slipped out
            const safeNickname = allUsers.find((u: any) => u.id === x.id)?.nickname || "Inconnu";
            return {
                userId: x.id,
                nickname: safeNickname,
                totalReps: x.totalXP,
                level: x.level,
                animal: x.animal,
                emoji: x.emoji,
                progress: x.progress,
                xpNextLvl: x.xpNextLvl,
                nextAnimal: x.nextAnimal,
                nextEmoji: x.nextEmoji,
                maxXP // pass it to size the bar
            };
        }).sort((a: any, b: any) => b.totalReps - a.totalReps);
    } else {
        // Query 2: Fetch all relevant users to get nicknames
        const users = await (prisma.user as any).findMany({
            where: {
                nickname: { not: 'modo' },
                league: league
            },
            select: {
                id: true,
                nickname: true,
            },
        });

        const userIdsInLeague = users.map((u: any) => u.id);

        // Query 1: Group by userId and sum reps
        const logs = await prisma.exerciseSet.groupBy({
            by: ["userId"],
            where: {
                userId: { in: userIdsInLeague },
                ...(selectedExercise === "ALL" ? {} : {
                    exercise: selectedExercise,
                }),
            },
            _sum: {
                reps: true,
            },
        });

        const userMap = new Map(users.map((u: any) => [u.id, u.nickname]));

        // Combine data and sort by total reps desc
        leaderboard = logs
            .map((log: any) => ({
                userId: log.userId,
                nickname: userMap.get(log.userId) || "Inconnu",
                totalReps: log._sum.reps || 0,
            }))
            .sort((a, b) => b.totalReps - a.totalReps);

        totalGroupReps = leaderboard.reduce((sum, entry) => sum + entry.totalReps, 0);
    }

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-12 pb-20">
            <header className="text-center space-y-4">
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter italic uppercase">
                    Le Leaderboard <span className="text-indigo-500">{selectedExercise === 'ALL' ? 'Global' : selectedExercise}</span>
                </h1>

                <div className="flex justify-center flex-wrap gap-2 mt-4">
                    {(['ALL', 'PUSHUP', 'PULLUP', 'SQUAT', 'XP'] as const).map(ex => (
                        <Link
                            key={ex}
                            href={`/leaderboard?exercise=${ex}`}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${selectedExercise === ex ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}`}
                        >
                            {ex}
                        </Link>
                    ))}
                </div>

                <div className="inline-flex items-center gap-3 bg-slate-900 border border-slate-800 px-6 py-2 rounded-full mt-4">
                    <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-slate-300 font-mono text-sm uppercase tracking-widest">
                        Total {selectedExercise} : <span className="text-white font-bold">{totalGroupReps.toLocaleString()}</span> REPS
                    </span>
                </div>
            </header>

            {/* Contribution Graph (HTML/CSS Only) */}
            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">📊</span> Part des Efforts
                </h2>

                <div className="space-y-4">
                    {leaderboard.map((entry) => {
                        let barValue = 0;
                        let displayValue = "";

                        if (selectedExercise === 'XP') {
                            barValue = entry.maxXP > 0 ? (entry.totalReps / entry.maxXP) * 100 : 0;
                            displayValue = `${entry.totalReps.toLocaleString('fr-FR')} XP`;
                        } else {
                            barValue = totalGroupReps > 0 ? (entry.totalReps / totalGroupReps) * 100 : 0;
                            displayValue = `${barValue.toFixed(1)}%`;
                        }

                        return (
                            <div key={entry.userId} className="space-y-1">
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="text-slate-300">{entry.nickname}</span>
                                    <span className="text-indigo-400 font-mono">{displayValue}</span>
                                </div>
                                <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-1000"
                                        style={{ width: `${barValue}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Rankings Table */}
            <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-800/50">
                            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Rang</th>
                            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Soldat</th>
                            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Volume Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {leaderboard.map((entry, index) => (
                            <tr key={entry.userId} className="hover:bg-slate-800/30 transition-colors group">
                                <td className="px-6 py-6">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${index === 0 ? "bg-yellow-500 text-yellow-950 scale-110 shadow-lg shadow-yellow-500/20" :
                                        index === 1 ? "bg-slate-300 text-slate-900" :
                                            index === 2 ? "bg-orange-600 text-orange-950" :
                                                "bg-slate-800 text-slate-400"
                                        }`}>
                                        {index + 1}
                                    </div>
                                </td>
                                <td className="px-6 py-6">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            {selectedExercise === 'XP' && entry.level && (
                                                <span className="text-xs font-black text-slate-400" title={entry.animal}>
                                                    [Lv.{entry.level} {entry.emoji}]
                                                </span>
                                            )}
                                            <Link
                                                href={`/u/${encodeURIComponent(entry.nickname)}`}
                                                className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors"
                                            >
                                                {entry.nickname}
                                            </Link>
                                        </div>
                                        {selectedExercise === 'XP' && entry.xpNextLvl && (
                                            <div className="mt-2 w-full max-w-[200px]">
                                                <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase mb-1 whitespace-nowrap gap-4">
                                                    <span>Niveau Suivant</span>
                                                    <span className="text-right">Lv.{entry.level + 1} {entry.nextAnimal} {entry.nextEmoji} ({entry.xpNextLvl.toLocaleString('fr-FR')} XP)</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${entry.progress}%` }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-6 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="text-2xl font-black text-white font-mono">{entry.totalReps.toLocaleString('fr-FR')}</span>
                                        <span className="text-[10px] font-bold text-slate-500 tracking-tighter uppercase">{selectedExercise === 'XP' ? 'Points XP' : `Volume ${selectedExercise}`}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <div className="text-center">
                <Link
                    href="/"
                    className="text-slate-500 hover:text-white transition-colors text-sm font-medium underline underline-offset-4"
                >
                    Retour à l'accueil
                </Link>
            </div>
        </div>
    );
}
