import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ─── GET — Vercel Cron : verrouiller les paris dont closeAt est dépassé ───────
// Appelée toutes les 15 minutes par Vercel Cron.
// Guard : header Authorization: Bearer {CRON_SECRET}
// Ne résout PAS automatiquement — la résolution reste manuelle (admin).

export async function GET(req: Request) {
    // ─── Authentification cron ────────────────────────────────────────────────
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    try {
        const now = new Date();

        // Trouver tous les paris OPEN dont closeAt est dépassé
        const expiredBets = await (prisma as any).bet.findMany({
            where: {
                status: "OPEN",
                closeAt: { lt: now },
            },
            select: { id: true, title: true, closeAt: true },
        });

        if (expiredBets.length === 0) {
            return NextResponse.json({ message: "Aucun pari à verrouiller", locked: 0 });
        }

        // Passer chacun en LOCKED
        const lockedIds: string[] = [];

        await (prisma as any).$transaction(async (tx: any) => {
            for (const bet of expiredBets) {
                await tx.bet.update({
                    where: { id: bet.id },
                    data: { status: "LOCKED" },
                });

                await tx.betEvent.create({
                    data: {
                        betId: bet.id,
                        userId: "CRON",
                        eventType: "LOCK",
                        metadata: JSON.stringify({
                            reason: "auto_lock_cron",
                            closeAt: bet.closeAt,
                            lockedAt: now.toISOString(),
                        }),
                    },
                });

                lockedIds.push(bet.id);
            }
        });

        console.log(`[cron/bets-check] ${lockedIds.length} paris verrouillés :`, lockedIds);

        return NextResponse.json({
            message: `${lockedIds.length} paris verrouillé(s)`,
            locked: lockedIds.length,
            ids: lockedIds,
        });

    } catch (error) {
        console.error("[cron/bets-check] error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
