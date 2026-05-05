import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTodayISO } from "@/lib/challenge";

export const dynamic = "force-dynamic";

// ─── POST — Annuler un pari et rembourser intégralement (admin) ───────────────

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }
        if (!(session.user as any).isAdmin) {
            return NextResponse.json({ message: "Accès admin requis" }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json().catch(() => ({}));
        const { note } = body;

        // ─── GARDE-FOU — déjà résolu ou annulé ? ─────────────────────────────
        const existingResult = await (prisma as any).betResult.findUnique({
            where: { betId: id }
        });
        if (existingResult) {
            return NextResponse.json({ message: "Ce pari possède déjà un résultat et ne peut plus être annulé" }, { status: 409 });
        }

        const bet = await (prisma as any).bet.findUnique({
            where: { id },
            include: { entries: true }
        });

        if (!bet) {
            return NextResponse.json({ message: "Pari introuvable" }, { status: 404 });
        }
        if (bet.status === "RESOLVED" || bet.status === "CANCELLED") {
            return NextResponse.json({
                message: `Impossible d'annuler un pari en statut "${bet.status}"`
            }, { status: 400 });
        }

        const cancelledByUserId = (session.user as any).id;
        const today = getTodayISO();

        // Entrées à rembourser (non retirées)
        const entriesToRefund = bet.entries.filter((e: any) => !e.withdrawn);

        // ─── Transaction atomique ─────────────────────────────────────────────
        await (prisma as any).$transaction(async (tx: any) => {

            // 1. BetResult avec winnerOption = null (annulation)
            await tx.betResult.create({
                data: {
                    betId: id,
                    winnerOption: null,
                    resolvedByUserId: cancelledByUserId,
                    distributionSnapshot: null,
                    note: note || "Pari annulé par admin",
                }
            });

            // 2. Mise à jour du Bet
            await tx.bet.update({
                where: { id },
                data: {
                    status: "CANCELLED",
                    resolvedAt: new Date(),
                    resolvedByUserId: cancelledByUserId,
                }
            });

            // 3. Remboursement intégral de chaque entrée non retirée
            for (const entry of entriesToRefund) {
                // XP — remboursement intégral de la mise
                await tx.xpAdjustment.create({
                    data: {
                        userId: entry.userId,
                        amount: entry.xpStaked,
                        reason: `BET_CANCELLED:${id}:${bet.title}`,
                        date: today,
                    }
                });
                // EC — remboursement si des EC avaient été misés
                if (entry.ecStaked > 0) {
                    await tx.coinAdjustment.create({
                        data: {
                            userId: entry.userId,
                            amount: entry.ecStaked,
                            reason: "BET_CANCELLED",
                            refId: id,
                            date: today,
                        }
                    });
                }
            }

            // 4. BetEvent CANCEL
            await tx.betEvent.create({
                data: {
                    betId: id,
                    userId: cancelledByUserId,
                    eventType: "CANCEL",
                    metadata: JSON.stringify({
                        reimbursedCount: entriesToRefund.length,
                        note: note || null,
                    }),
                }
            });

        });

        return NextResponse.json({
            message: `Pari annulé — ${entriesToRefund.length} joueur(s) remboursé(s) intégralement`,
            reimbursedCount: entriesToRefund.length,
        });

    } catch (error) {
        console.error("POST /api/bets/[id]/cancel error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
