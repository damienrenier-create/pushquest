import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { calculateOddsDisplay, calculateBookmakerOdds, calculateEarlyBirdMultiplier, calculateFinalOdd, StatOddsInput } from "@/lib/bets";

export const dynamic = "force-dynamic";

// ─── Helper — fetch real stat value for a user ────────────────────────────────

async function fetchStatValue(statUserId: string, statType: string, now: Date): Promise<{ value: number; label: string }> {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (statType) {
        case "torch_count_30d": {
            // Flambeaux stockés dans badgeEvent avec toUserId + TORCH_CLAIM
            const count = await (prisma as any).badgeEvent.count({
                where: {
                    badgeKey: "torch_daily",
                    eventType: "TORCH_CLAIM",
                    toUserId: statUserId,
                    createdAt: { gte: thirtyDaysAgo }
                }
            });
            return { value: count, label: `${count} flambeaux / 30j` };
        }
        case "completion_rate_30d": {
            const logs = await (prisma as any).dailyLog.findMany({
                where: { userId: statUserId, date: { gte: thirtyDaysAgo.toISOString().slice(0, 10) } },
                select: { validated: true }
            });
            const rate = logs.length > 0 ? Math.round((logs.filter((l: any) => l.validated).length / logs.length) * 100) : 0;
            return { value: rate, label: `${rate}% complétion / 30j` };
        }
        case "total_pushups_30d": {
            const sets = await (prisma as any).exerciseSet.findMany({
                where: { userId: statUserId, exercise: "PUSHUP", date: { gte: thirtyDaysAgo.toISOString().slice(0, 10) } },
                select: { reps: true }
            });
            const total = sets.reduce((sum: number, s: any) => sum + (s.reps || 0), 0);
            return { value: total, label: `${total} pompes / 30j` };
        }
        case "total_pullups_30d": {
            const sets = await (prisma as any).exerciseSet.findMany({
                where: { userId: statUserId, exercise: "PULLUP", date: { gte: thirtyDaysAgo.toISOString().slice(0, 10) } },
                select: { reps: true }
            });
            const total = sets.reduce((sum: number, s: any) => sum + (s.reps || 0), 0);
            return { value: total, label: `${total} tractions / 30j` };
        }
        case "total_squats_30d": {
            const sets = await (prisma as any).exerciseSet.findMany({
                where: { userId: statUserId, exercise: "SQUAT", date: { gte: thirtyDaysAgo.toISOString().slice(0, 10) } },
                select: { reps: true }
            });
            const total = sets.reduce((sum: number, s: any) => sum + (s.reps || 0), 0);
            return { value: total, label: `${total} squats / 30j` };
        }
        case "total_reps_30d": {
            const sets = await (prisma as any).exerciseSet.findMany({
                where: { userId: statUserId, date: { gte: thirtyDaysAgo.toISOString().slice(0, 10) } },
                select: { reps: true }
            });
            const total = sets.reduce((sum: number, s: any) => sum + (s.reps || 0), 0);
            return { value: total, label: `${total} reps / 30j` };
        }
        case "current_xp": {
            const user = await (prisma as any).user.findUnique({ where: { id: statUserId }, select: { xp: true } });
            const xp = user?.xp || 0;
            return { value: xp, label: `${xp} XP total` };
        }
        default:
            return { value: 1, label: "stat inconnue" };
    }
}

// ─── GET — Liste des paris OPEN et LOCKED ────────────────────────────────────

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }
        const userId = (session.user as any).id;

        const bets = await (prisma as any).bet.findMany({
            where: { status: { in: ["OPEN", "LOCKED", "DRAFT", "RESOLVED"] } },
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
                        xpReturned: true,
                        placedAt: true,
                    }
                },
                result: true,
            },
            orderBy: { createdAt: "desc" }
        });

        const now = new Date();

        const formatted = await Promise.all(bets.map(async (bet: any) => {
            const options = (() => {
                try { return JSON.parse(bet.options); } catch { return []; }
            })();

            const activeEntries = bet.entries.filter((e: any) => !e.withdrawn);
            const totalPool = activeEntries.reduce((sum: number, e: any) => sum + e.xpStaked, 0)
                - bet.entries.reduce((sum: number, e: any) => sum + (e.xpReturned || 0), 0);

            const oddsDisplay = (bet.status === "OPEN" || bet.status === "LOCKED") && bet.openAt && bet.closeAt
                ? calculateOddsDisplay(options, bet.entries, new Date(bet.openAt), new Date(bet.closeAt), now)
                : [];

            const myEntry = bet.entries.find((e: any) => e.userId === userId) || null;

            // ── Bookmaker odds — calculées depuis les stats réelles ──────────────
            let bookmakerOdds: any[] = [];
            if ((bet.status === "OPEN" || bet.status === "LOCKED") && bet.openAt && bet.closeAt && bet.metadata) {
                try {
                    const metadata = typeof bet.metadata === "string" ? JSON.parse(bet.metadata) : bet.metadata;
                    const statsConfig: Array<{ key: string; label: string; statType: string; userId: string; isInverse?: boolean }> = metadata.statsConfig || [];
                    const manualOdds: Array<{ key: string; label: string; odd: number; statLabel: string }> = metadata.manualOdds || [];

                    const earlyBirdMultiplier = calculateEarlyBirdMultiplier(
                        new Date(bet.openAt),
                        new Date(bet.closeAt),
                        now
                    );

                    if (statsConfig.length > 0) {
                        // Cotes calculées depuis les vraies stats
                        const inputs: StatOddsInput[] = await Promise.all(
                            statsConfig.map(async (cfg) => {
                                const { value, label: statLabel } = await fetchStatValue(cfg.userId, cfg.statType, now);
                                return {
                                    key: cfg.key,
                                    label: cfg.label,
                                    statValue: value,
                                    statLabel,
                                    isInverse: cfg.isInverse || false,
                                } as StatOddsInput;
                            })
                        );

                        const baseOdds = calculateBookmakerOdds(inputs);
                        bookmakerOdds = baseOdds.map(o => ({
                            ...o,
                            earlyBirdMultiplier: parseFloat(earlyBirdMultiplier.toFixed(2)),
                            finalOdd: calculateFinalOdd(o.odd, earlyBirdMultiplier),
                            impliedGainFinal: Math.round(100 * calculateFinalOdd(o.odd, earlyBirdMultiplier)),
                        }));

                    } else if (manualOdds.length > 0) {
                        // Cotes manuelles définies par l'admin — Early Bird appliqué par-dessus
                        bookmakerOdds = manualOdds.map(o => ({
                            key: o.key,
                            label: o.label,
                            statLabel: o.statLabel,
                            probability: parseFloat((1 / o.odd).toFixed(3)),
                            odd: o.odd,
                            impliedGain: Math.round(100 * o.odd),
                            earlyBirdMultiplier: parseFloat(earlyBirdMultiplier.toFixed(2)),
                            finalOdd: calculateFinalOdd(o.odd, earlyBirdMultiplier),
                            impliedGainFinal: Math.round(100 * calculateFinalOdd(o.odd, earlyBirdMultiplier)),
                        }));
                    }
                } catch (e) {
                    // Silently ignore — bookmakerOdds stays []
                }
            }


            return {
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
                createdAt: bet.createdAt,
                totalPool,
                oddsDisplay,
                bookmakerOdds,
                myEntry,
                result: bet.result || null,
            };
        }));

        return NextResponse.json(formatted);


    } catch (error) {
        console.error("GET /api/bets error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}

// ─── POST — Créer un pari (admin) ─────────────────────────────────────────────

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }
        if (!(session.user as any).isAdmin) {
            return NextResponse.json({ message: "Accès admin requis" }, { status: 403 });
        }

        const body = await req.json();
        const { type, subType, title, description, options, closeAt, targetUserId } = body;

        // Validations
        if (!type || !title || !options || !closeAt) {
            return NextResponse.json({ message: "Champs requis manquants : type, title, options, closeAt" }, { status: 400 });
        }
        if (!Array.isArray(options) || options.length < 2) {
            return NextResponse.json({ message: "options doit contenir au moins 2 éléments [{ key, label }]" }, { status: 400 });
        }
        for (const opt of options) {
            if (!opt.key || !opt.label) {
                return NextResponse.json({ message: "Chaque option doit avoir key et label" }, { status: 400 });
            }
        }
        if (new Date(closeAt) <= new Date()) {
            return NextResponse.json({ message: "closeAt doit être dans le futur" }, { status: 400 });
        }
        if (type === "DUEL" && !targetUserId) {
            return NextResponse.json({ message: "targetUserId requis pour un pari de type DUEL" }, { status: 400 });
        }

        const bet = await (prisma as any).bet.create({
            data: {
                type,
                subType: subType || "BINARY",
                title,
                description: description || null,
                options: JSON.stringify(options),
                status: "DRAFT",
                closeAt: new Date(closeAt),
                createdByUserId: (session.user as any).id,
                targetUserId: targetUserId || null,
                metadata: null,
            }
        });

        return NextResponse.json({ ...bet, options });

    } catch (error) {
        console.error("POST /api/bets error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
