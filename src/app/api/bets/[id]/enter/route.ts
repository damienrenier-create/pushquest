import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTodayISO } from "@/lib/challenge";
import { calculateEntryMultiplier, calculateWeightedMultiplier, calculateBookmakerOdds, calculateEarlyBirdMultiplier, calculateFinalOdd } from "@/lib/bets";
import { MONTH_MULTIPLIERS } from "@/lib/xp-constants";

export const dynamic = "force-dynamic";

// ─── Calcul XP disponible (approximation légère, sans calculateAllUsersXP) ───

async function getRealAvailableXP(userId: string, tx: any): Promise<number> {
    const user = await (tx as any).user.findUnique({
        where: { id: userId },
        include: {
            sets: true,
            xpAdjustments: true,
            medicalCertificates: true,
            fines: true,
            badges: {
                include: { badge: true }
            }
        }
    });

    if (!user) return 0;

    // Calcul simplifié mais honnête :
    // 1. XP des reps (1 XP par rep)
    const repsXP = (user.sets || []).reduce((sum: number, s: any) => {
        return sum + (s.exercise === 'PLANK' ? Math.floor(s.reps / 5) : s.reps);
    }, 0);

    // 2. XP des ajustements (paris, bonus manuels)
    const adjustmentsXP = (user.xpAdjustments || []).reduce(
        (sum: number, a: any) => sum + a.amount, 0
    );

    // Total approximatif fiable
    return Math.max(0, repsXP + adjustmentsXP);
}

// ─── POST — Placer ou augmenter une mise ─────────────────────────────────────

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }
        const userId = (session.user as any).id;
        const { id } = await params;

        const body = await req.json();
        const { option, xpAmount } = body;

        if (!option || !xpAmount || typeof xpAmount !== "number" || xpAmount <= 0 || !Number.isInteger(xpAmount)) {
            return NextResponse.json({ message: "option et xpAmount (entier > 0) requis" }, { status: 400 });
        }

        // Plafond de mise = MONTH_MULTIPLIER du mois courant
        const currentMonthIndex = new Date().getMonth(); // 0 = Jan, 4 = Mai
        const maxBet = MONTH_MULTIPLIERS[currentMonthIndex] || 500;
        if (xpAmount > maxBet) {
            return NextResponse.json(
                { message: `Mise maximum : ${maxBet} XP ce mois-ci` },
                { status: 400 }
            );
        }

        // ─── Charger le Bet ───────────────────────────────────────────────────
        const bet = await (prisma as any).bet.findUnique({
            where: { id },
            include: { entries: true }
        });

        if (!bet) {
            return NextResponse.json({ message: "Pari introuvable" }, { status: 404 });
        }
        if (bet.status !== "OPEN") {
            return NextResponse.json({ message: `Les mises sont closes (statut : ${bet.status})` }, { status: 403 });
        }
        if (!bet.closeAt || new Date() >= new Date(bet.closeAt)) {
            return NextResponse.json({ message: "Les mises sont closes — la date limite est dépassée" }, { status: 403 });
        }

        // ─── Le créateur du pari ne peut pas parier ───────────────────────────
        if (bet.createdByUserId === userId) {
            return NextResponse.json({ message: "Le créateur du pari ne peut pas y miser" }, { status: 403 });
        }

        // ─── Valider l'option ─────────────────────────────────────────────────
        const options: Array<{ key: string; label: string }> = (() => {
            try { return JSON.parse(bet.options); } catch { return []; }
        })();
        const validKeys = options.map((o) => o.key);
        if (!validKeys.includes(option)) {
            return NextResponse.json({ message: `Option invalide "${option}". Valides : ${validKeys.join(", ")}` }, { status: 400 });
        }

        // ─── Vérifier BetEntry existante ──────────────────────────────────────
        const existing = bet.entries.find((e: any) => e.userId === userId);
        let mode: "NEW" | "INCREASE" = "NEW";

        if (existing) {
            if (existing.withdrawn) {
                return NextResponse.json({ message: "Position retirée — impossible de re-miser sur ce pari" }, { status: 403 });
            }
            if (existing.option !== option) {
                return NextResponse.json({ message: "Vous avez déjà misé sur une autre option. Retirez votre position d'abord." }, { status: 403 });
            }
            mode = "INCREASE";
        }

        // ─── Multiplicateur selon le temps écoulé ─────────────────────────────
        const multiplier = calculateEntryMultiplier(new Date(bet.openAt), new Date(bet.closeAt), new Date());

        // ─── Vérifier XP disponible ───────────────────────────────────────────
        const available = await getRealAvailableXP(userId, prisma);
        if (xpAmount > available) {
            return NextResponse.json({ message: `XP insuffisant (disponible approximatif : ${available})` }, { status: 400 });
        }

        const today = getTodayISO();
        let finalEntry: any;

        // Calculer la cote bookmaker figée pour cette mise
        let lockedOdd: number | null = null;

        const betMeta = (() => { try { return JSON.parse(bet.metadata || '{}'); } catch { return {}; } })();

        if (betMeta.statsConfig && Array.isArray(betMeta.statsConfig)) {
            // Recalculer les stats en temps réel
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const thirtyDaysAgoISO = thirtyDaysAgo.toISOString().split('T')[0];

            const statInputs: any[] = await Promise.all(
                betMeta.statsConfig.map(async (cfg: any) => {
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
                        statLabel = `${count} flambeaux / 30j`;
                    } else if (cfg.statType === "completion_rate_30d") {
                        const user = await prisma.user.findUnique({
                            where: { id: cfg.userId },
                            include: { sets: { where: { date: { gte: thirtyDaysAgoISO } } } }
                        });
                        if (user) {
                            const setsByDate = (user.sets || []).reduce((acc: Record<string, number>, s: any) => {
                                acc[s.date] = (acc[s.date] || 0) + (s.exercise === 'PLANK' ? Math.floor(s.reps / 5) : s.reps);
                                return acc;
                            }, {});
                            statValue = Object.values(setsByDate).filter((t: any) => t > 0).length;
                            statLabel = `${statValue} jours validés / 30j`;
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

                    return { key: cfg.key, label: cfg.label || cfg.key, statValue, statLabel, isInverse: cfg.isInverse || false };
                })
            );

            const baseOdds = calculateBookmakerOdds(statInputs, 0.10);
            const earlyBirdMult = calculateEarlyBirdMultiplier(
                new Date(bet.openAt),
                new Date(bet.closeAt),
                now
            );
            const optionOdd = baseOdds.find(o => o.key === option);
            if (optionOdd) {
                lockedOdd = calculateFinalOdd(optionOdd.odd, earlyBirdMult);
            }
        }

        // ─── Transaction atomique ─────────────────────────────────────────────
        await (prisma as any).$transaction(async (tx: any) => {

            if (mode === "NEW") {
                // a. Créer BetEntry
                finalEntry = await tx.betEntry.create({
                    data: {
                        betId: id,
                        userId,
                        option,
                        xpStaked: xpAmount,
                        multiplier,
                        lockedOdd,
                        placedAt: new Date(),
                    }
                });
                // b. Débiter XP
                await tx.xpAdjustment.create({
                    data: {
                        userId,
                        amount: -xpAmount,
                        reason: `BET_STAKE:${id}:${bet.title}`,
                        date: today,
                    }
                });
                // c. BetEvent STAKE
                await tx.betEvent.create({
                    data: {
                        betId: id,
                        userId,
                        eventType: "STAKE",
                        xpAmount,
                        option,
                        multiplier,
                    }
                });

            } else {
                // Mode INCREASE
                // a. Calculer multiplicateur pondéré
                const newMultiplier = calculateWeightedMultiplier(
                    existing.xpStaked,
                    existing.multiplier,
                    xpAmount,
                    multiplier
                );
                // b. Update BetEntry
                finalEntry = await tx.betEntry.update({
                    where: { id: existing.id },
                    data: {
                        xpStaked: existing.xpStaked + xpAmount,
                        multiplier: newMultiplier,
                    }
                });
                // c. Débiter XP
                await tx.xpAdjustment.create({
                    data: {
                        userId,
                        amount: -xpAmount,
                        reason: `BET_STAKE:${id}:${bet.title}`,
                        date: today,
                    }
                });
                // d. BetEvent INCREASE
                await tx.betEvent.create({
                    data: {
                        betId: id,
                        userId,
                        eventType: "INCREASE",
                        xpAmount,
                        option,
                        multiplier,
                    }
                });
            }

        });

        return NextResponse.json({
            message: mode === "NEW" ? "Mise placée avec succès" : "Mise augmentée avec succès",
            entry: finalEntry,
            multiplier,
            lockedOdd,
            xpStaked: finalEntry.xpStaked,
        });

    } catch (error) {
        console.error("POST /api/bets/[id]/enter error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
