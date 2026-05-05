import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTodayISO } from "@/lib/challenge";
import { calculateEntryMultiplier, calculateWeightedMultiplier } from "@/lib/bets";

export const dynamic = "force-dynamic";

// ─── Calcul XP disponible (approximation légère, sans calculateAllUsersXP) ───

async function getApproxAvailableXP(userId: string, tx: any): Promise<number> {
    const adjustments = await (tx as any).xpAdjustment.findMany({
        where: { userId },
        select: { amount: true }
    });
    const adjustmentsTotal = adjustments.reduce((sum: number, a: any) => sum + a.amount, 0);
    // Buffer conservateur pour les reps de base non capturés dans les ajustements
    return Math.max(0, adjustmentsTotal + 500);
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
        const available = await getApproxAvailableXP(userId, prisma);
        if (xpAmount > available) {
            return NextResponse.json({ message: `XP insuffisant (disponible approximatif : ${available})` }, { status: 400 });
        }

        const today = getTodayISO();
        let finalEntry: any;

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
            xpStaked: finalEntry.xpStaked,
        });

    } catch (error) {
        console.error("POST /api/bets/[id]/enter error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
