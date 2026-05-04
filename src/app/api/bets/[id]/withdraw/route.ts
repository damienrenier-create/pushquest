import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTodayISO } from "@/lib/challenge";
import { calculateWithdrawReturn } from "@/lib/bets";

export const dynamic = "force-dynamic";

// ─── POST — Se retirer avec malus ────────────────────────────────────────────

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
        if (bet.status !== "OPEN") {
            return NextResponse.json({ message: `Retrait impossible — pari en statut "${bet.status}"` }, { status: 403 });
        }

        // ─── Vérifier la BetEntry ─────────────────────────────────────────────
        const entry = bet.entries.find((e: any) => e.userId === userId);
        if (!entry) {
            return NextResponse.json({ message: "Vous n'avez pas de mise sur ce pari" }, { status: 404 });
        }
        if (entry.withdrawn) {
            return NextResponse.json({ message: "Vous avez déjà retiré votre mise" }, { status: 409 });
        }

        // ─── Calculer le retour XP avec malus ────────────────────────────────
        const xpReturned = calculateWithdrawReturn(
            entry.xpStaked,
            new Date(bet.openAt),
            new Date(bet.closeAt),
            new Date()
        );

        if (xpReturned === null) {
            return NextResponse.json({ message: "Retrait impossible dans la dernière heure du pari" }, { status: 403 });
        }

        const xpLost = entry.xpStaked - xpReturned;
        const today = getTodayISO();

        // ─── Transaction atomique ─────────────────────────────────────────────
        await (prisma as any).$transaction(async (tx: any) => {

            // a. Marquer l'entrée comme retirée
            await tx.betEntry.update({
                where: { id: entry.id },
                data: {
                    withdrawn: true,
                    withdrawnAt: new Date(),
                    xpReturned,
                }
            });

            // b. Rembourser XP (avec malus)
            await tx.xpAdjustment.create({
                data: {
                    userId,
                    amount: xpReturned,
                    reason: `BET_WITHDRAW:${id}:${bet.title}`,
                    date: today,
                }
            });

            // c. BetEvent WITHDRAW
            await tx.betEvent.create({
                data: {
                    betId: id,
                    userId,
                    eventType: "WITHDRAW",
                    xpAmount: xpReturned,
                    metadata: JSON.stringify({
                        xpStaked: entry.xpStaked,
                        xpLost,
                    }),
                }
            });

        });

        return NextResponse.json({
            message: `Retrait effectué — ${xpReturned} XP récupérés (${xpLost} XP perdus en malus)`,
            xpReturned,
            xpLost,
        });

    } catch (error) {
        console.error("POST /api/bets/[id]/withdraw error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
