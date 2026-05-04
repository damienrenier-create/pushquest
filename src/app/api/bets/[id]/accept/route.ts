import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTodayISO } from "@/lib/challenge";
import { calculateEntryMultiplier } from "@/lib/bets";

export const dynamic = "force-dynamic";

// ─── Calcul XP disponible (approximation légère, sans calculateAllUsersXP) ───

async function getApproxAvailableXP(userId: string, tx: any): Promise<number> {
    const adjustments = await (tx as any).xpAdjustment.findMany({
        where: { userId },
        select: { amount: true }
    });
    const adjustmentsTotal = adjustments.reduce((sum: number, a: any) => sum + a.amount, 0);
    return Math.max(0, adjustmentsTotal + 500);
}

// ─── POST — Accepter un duel (targetUser uniquement) ─────────────────────────

export async function POST(
    _req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }
        const userId = (session.user as any).id;
        const { id } = params;

        // ─── Charger le Bet ───────────────────────────────────────────────────
        const bet = await (prisma as any).bet.findUnique({
            where: { id },
            include: { entries: true }
        });

        if (!bet) {
            return NextResponse.json({ message: "Pari introuvable" }, { status: 404 });
        }
        if (bet.type !== "DUEL") {
            return NextResponse.json({ message: "Cette route est réservée aux paris de type DUEL" }, { status: 400 });
        }
        if (bet.targetUserId !== userId) {
            return NextResponse.json({ message: "Seul le joueur ciblé peut accepter ce duel" }, { status: 403 });
        }
        if (bet.status !== "OPEN") {
            return NextResponse.json({ message: `Impossible d'accepter un duel en statut "${bet.status}"` }, { status: 403 });
        }

        // ─── Vérifier qu'aucune BetEntry n'existe déjà pour ce joueur ─────────
        const existingEntry = bet.entries.find((e: any) => e.userId === userId);
        if (existingEntry) {
            return NextResponse.json({ message: "Vous avez déjà une position sur ce duel" }, { status: 409 });
        }

        // ─── Trouver la mise du créateur ──────────────────────────────────────
        const creatorEntry = bet.entries.find((e: any) => e.userId === bet.createdByUserId);
        if (!creatorEntry) {
            return NextResponse.json({ message: "Mise du créateur introuvable — duel invalide" }, { status: 500 });
        }
        const xpAmount = creatorEntry.xpStaked;

        // ─── Vérifier XP disponible ───────────────────────────────────────────
        const available = await getApproxAvailableXP(userId, prisma);
        if (xpAmount > available) {
            return NextResponse.json({
                message: `XP insuffisant pour accepter ce duel (requis : ${xpAmount}, disponible approximatif : ${available})`
            }, { status: 400 });
        }

        // ─── Calculer l'option opposée ────────────────────────────────────────
        const options: Array<{ key: string; label: string }> = (() => {
            try { return JSON.parse(bet.options); } catch { return []; }
        })();
        const creatorOption = creatorEntry.option;
        const myOption = options.find((o) => o.key !== creatorOption)?.key || options[1]?.key;
        if (!myOption) {
            return NextResponse.json({ message: "Impossible de déterminer l'option opposée — configuration duel invalide" }, { status: 500 });
        }

        const multiplier = calculateEntryMultiplier(new Date(bet.openAt), new Date(bet.closeAt), new Date());
        const today = getTodayISO();
        let finalEntry: any;

        // ─── Transaction atomique ─────────────────────────────────────────────
        await (prisma as any).$transaction(async (tx: any) => {

            // a. Créer BetEntry pour le targetUser
            finalEntry = await tx.betEntry.create({
                data: {
                    betId: id,
                    userId,
                    option: myOption,
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

            // c. BetEvent DUEL_ACCEPTED
            await tx.betEvent.create({
                data: {
                    betId: id,
                    userId,
                    eventType: "DUEL_ACCEPTED",
                    xpAmount,
                    option: myOption,
                    metadata: JSON.stringify({ vsUserId: bet.createdByUserId }),
                }
            });

        });

        return NextResponse.json({
            message: "Duel accepté — la bataille commence !",
            entry: finalEntry,
        });

    } catch (error) {
        console.error("POST /api/bets/[id]/accept error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
