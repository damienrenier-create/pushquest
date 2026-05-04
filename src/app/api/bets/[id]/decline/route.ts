import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTodayISO } from "@/lib/challenge";

export const dynamic = "force-dynamic";

// ─── POST — Refuser un duel (targetUser uniquement) ──────────────────────────

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
            return NextResponse.json({ message: "Seul le joueur ciblé peut refuser ce duel" }, { status: 403 });
        }
        if (bet.status !== "OPEN") {
            return NextResponse.json({ message: `Impossible de refuser un duel en statut "${bet.status}"` }, { status: 403 });
        }

        // ─── Idempotence — vérifier qu'il n'est pas déjà résolu/annulé ────────
        const existingResult = await (prisma as any).betResult.findUnique({
            where: { betId: id }
        });
        if (existingResult) {
            return NextResponse.json({ message: "Ce duel est déjà résolu ou refusé" }, { status: 409 });
        }

        // ─── Trouver la mise du créateur ──────────────────────────────────────
        const creatorEntry = bet.entries.find((e: any) => e.userId === bet.createdByUserId);
        if (!creatorEntry) {
            return NextResponse.json({ message: "Mise du créateur introuvable" }, { status: 500 });
        }

        const today = getTodayISO();

        // ─── Transaction atomique ─────────────────────────────────────────────
        await (prisma as any).$transaction(async (tx: any) => {

            // a. Créer BetResult
            await tx.betResult.create({
                data: {
                    betId: id,
                    winnerOption: null,
                    resolvedByUserId: userId,
                    note: "Duel refusé",
                }
            });

            // b. Update Bet
            await tx.bet.update({
                where: { id },
                data: {
                    status: "CANCELLED",
                    resolvedAt: new Date(),
                    resolvedByUserId: userId,
                }
            });

            // c. Rembourser intégralement le créateur
            await tx.xpAdjustment.create({
                data: {
                    userId: creatorEntry.userId,
                    amount: creatorEntry.xpStaked,
                    reason: `BET_DECLINED:${id}:${bet.title}`,
                    date: today,
                }
            });

            await tx.betEntry.update({
                where: { id: creatorEntry.id },
                data: {
                    withdrawn: true,
                    withdrawnAt: new Date(),
                    xpReturned: creatorEntry.xpStaked,
                }
            });

            // Si ecStaked > 0, rembourser EC
            if (creatorEntry.ecStaked > 0) {
                 await tx.coinAdjustment.create({
                    data: {
                        userId: creatorEntry.userId,
                        amount: creatorEntry.ecStaked,
                        reason: "BET_DECLINED",
                        refId: id,
                        date: today,
                    }
                });
            }

            // d. Créer BetEvent
            await tx.betEvent.create({
                data: {
                    betId: id,
                    userId,
                    eventType: "DUEL_DECLINED",
                }
            });
        });

        return NextResponse.json({ message: "Duel refusé. Le créateur a été remboursé." });

    } catch (error) {
        console.error("POST /api/bets/[id]/decline error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
