import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { calculateOddsDisplay, calculateBookmakerOdds, calculateEarlyBirdMultiplier, calculateFinalOdd } from "@/lib/bets";

export const dynamic = "force-dynamic";

// ─── GET — Détail d'un pari ───────────────────────────────────────────────────

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }
        const userId = (session.user as any).id;
        const { id } = await params;

        const bet = await (prisma as any).bet.findUnique({
            where: { id },
            include: {
                entries: {
                    select: {
                        id: true,
                        userId: true,
                        option: true,
                        xpStaked: true,
                        multiplier: true,
                        ecStaked: true,
                        withdrawn: true,
                        withdrawnAt: true,
                        xpReturned: true,
                        ecReturned: true,
                        placedAt: true,
                    }
                },
                result: true,
            }
        });

        if (!bet) {
            return NextResponse.json({ message: "Pari introuvable" }, { status: 404 });
        }

        const options = (() => {
            try { return JSON.parse(bet.options); } catch { return []; }
        })();

        const now = new Date();

        const totalPool = bet.entries.reduce((sum: number, e: any) => sum + e.xpStaked, 0)
            - bet.entries.reduce((sum: number, e: any) => sum + (e.xpReturned || 0), 0);

        const oddsDisplay = (bet.status === "OPEN" || bet.status === "LOCKED") && bet.openAt && bet.closeAt
            ? calculateOddsDisplay(options, bet.entries, new Date(bet.openAt), new Date(bet.closeAt), now)
            : [];

        const myEntry = bet.entries.find((e: any) => e.userId === userId) || null;

        let bookmakerOdds: any[] | null = null;
        let currentFinalOdd: number | null = null;

        const meta = (() => { try { return JSON.parse(bet.metadata || '{}'); } catch { return {}; } })();

        if (meta.statsConfig && Array.isArray(meta.statsConfig)) {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const thirtyDaysAgoISO = thirtyDaysAgo.toISOString().split('T')[0];

            const statInputs: any[] = await Promise.all(
                meta.statsConfig.map(async (cfg: any) => {
                    let statValue = 0;
                    let statLabel = "";

                    if (cfg.statType === "torch_count_30d") {
                        const count = await (prisma as any).badgeEvent.count({
                            where: {
                                toUserId: cfg.userId,
                                eventType: "TORCH_CLAIM",
                                badgeKey: "torch_daily",
                                createdAt: { gte: thirtyDaysAgo }
                            }
                        });
                        statValue = count;
                        statLabel = `${count} flambeau${count > 1 ? 'x' : ''} / 30j`;

                    } else if (cfg.statType === "completion_rate_30d") {
                        const user = await prisma.user.findUnique({
                            where: { id: cfg.userId },
                            include: {
                                sets: { where: { date: { gte: thirtyDaysAgoISO } } },
                                medicalCertificates: true,
                                fines: true
                            }
                        });
                        if (user) {
                            const setsByDate = (user.sets || []).reduce((acc: Record<string, number>, s: any) => {
                                acc[s.date] = (acc[s.date] || 0) + (s.exercise === 'PLANK' ? Math.floor(s.reps / 5) : s.reps);
                                return acc;
                            }, {});
                            const validatedDays = Object.values(setsByDate).filter((total: any) => total > 0).length;
                            statValue = validatedDays;
                            statLabel = `${validatedDays} jours validés / 30j`;
                        }

                    } else if (cfg.statType === "total_pushups_30d") {
                        const result = await (prisma as any).exerciseSet.aggregate({
                            where: { userId: cfg.userId, exercise: "PUSHUP", date: { gte: thirtyDaysAgoISO } },
                            _sum: { reps: true }
                        });
                        statValue = result._sum?.reps || 0;
                        statLabel = `${statValue} pompes / 30j`;

                    } else if (cfg.statType === "total_reps_30d") {
                        const result = await (prisma as any).exerciseSet.aggregate({
                            where: { userId: cfg.userId, date: { gte: thirtyDaysAgoISO } },
                            _sum: { reps: true }
                        });
                        statValue = result._sum?.reps || 0;
                        statLabel = `${statValue} reps / 30j`;
                    }

                    return {
                        key: cfg.key,
                        label: cfg.label || cfg.key,
                        statValue,
                        statLabel,
                        isInverse: cfg.isInverse || false
                    };
                })
            );

            const baseOdds = calculateBookmakerOdds(statInputs, 0.10);
            const earlyBirdMult = calculateEarlyBirdMultiplier(
                new Date(bet.openAt),
                new Date(bet.closeAt),
                now
            );

            bookmakerOdds = baseOdds.map(o => ({
                ...o,
                earlyBirdMultiplier: earlyBirdMult,
                finalOdd: calculateFinalOdd(o.odd, earlyBirdMult),
                impliedGainFinal: Math.round(100 * calculateFinalOdd(o.odd, earlyBirdMult))
            }));

            currentFinalOdd = earlyBirdMult;
        }

        return NextResponse.json({
            id: bet.id,
            type: bet.type,
            subType: bet.subType,
            title: bet.title,
            description: bet.description,
            options,
            status: bet.status,
            openAt: bet.openAt,
            closeAt: bet.closeAt,
            lockAt: bet.lockAt,
            resolvedAt: bet.resolvedAt,
            resolvedOption: bet.resolvedOption,
            resolvedByUserId: bet.resolvedByUserId,
            createdByUserId: bet.createdByUserId,
            targetUserId: bet.targetUserId,
            metadata: bet.metadata,
            createdAt: bet.createdAt,
            updatedAt: bet.updatedAt,
            entries: bet.entries,
            totalPool,
            oddsDisplay,
            myEntry,
            result: bet.result || null,
            bookmakerOdds,
            currentEarlyBirdMultiplier: currentFinalOdd,
        });

    } catch (error) {
        console.error("GET /api/bets/[id] error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
