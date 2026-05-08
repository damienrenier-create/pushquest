import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ─── POST — Corriger la cote figée d'une BetEntry (admin uniquement) ─────────

export async function POST(
    req: Request,
    { params }: { params: Promise<{ betId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }
        if (!(session.user as any).isAdmin) {
            return NextResponse.json({ message: "Accès admin requis" }, { status: 403 });
        }

        const { betId } = await params;
        const body = await req.json();
        const { userId, lockedOdd, reason } = body;

        if (!userId || typeof lockedOdd !== "number" || lockedOdd <= 0 || !reason) {
            return NextResponse.json(
                { message: "userId, lockedOdd (number > 0) et reason sont requis" },
                { status: 400 }
            );
        }

        // ─── Charger le pari ──────────────────────────────────────────────────
        const bet = await (prisma as any).bet.findUnique({
            where: { id: betId },
            include: { entries: { where: { userId, withdrawn: false } } }
        });

        if (!bet) {
            return NextResponse.json({ message: "Pari introuvable" }, { status: 404 });
        }
        if (bet.status === "RESOLVED" || bet.status === "CANCELLED") {
            return NextResponse.json(
                { message: `Impossible de corriger un pari en statut "${bet.status}"` },
                { status: 400 }
            );
        }

        const entry = bet.entries[0];
        if (!entry) {
            return NextResponse.json(
                { message: `Aucune entrée active trouvée pour l'utilisateur ${userId} sur ce pari` },
                { status: 404 }
            );
        }

        const oldOdd = entry.lockedOdd;

        // ─── Transaction atomique ─────────────────────────────────────────────
        const updatedEntry = await (prisma as any).$transaction(async (tx: any) => {
            // 1. Mise à jour du lockedOdd
            const updated = await tx.betEntry.update({
                where: { id: entry.id },
                data: { lockedOdd }
            });

            // 2. Audit BetEvent
            await tx.betEvent.create({
                data: {
                    betId,
                    userId,
                    eventType: "ADMIN_ODD_CORRECTION",
                    metadata: JSON.stringify({
                        reason,
                        oldOdd,
                        newOdd: lockedOdd,
                        correctedBy: (session.user as any).id,
                    }),
                }
            });

            return updated;
        });

        return NextResponse.json({
            message: `Cote corrigée : ${oldOdd} → ${lockedOdd}`,
            entry: updatedEntry,
        });

    } catch (error) {
        console.error("POST /api/admin/bets/[betId]/correct-odd error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
