import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTodayISO } from "@/lib/challenge";
import { calculateWinnings } from "@/lib/bets";

export const dynamic = "force-dynamic";

// ─── POST — Résoudre un pari et distribuer les gains (admin) ─────────────────

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
        const body = await req.json();
        const { winnerOption, note } = body;

        if (!winnerOption) {
            return NextResponse.json({ message: "winnerOption requis" }, { status: 400 });
        }

        // ─── GARDE-FOU IDEMPOTENCE — vérifier EN PREMIER ─────────────────────
        const existingResult = await (prisma as any).betResult.findUnique({
            where: { betId: id }
        });
        if (existingResult) {
            return NextResponse.json({ message: "Ce pari est déjà résolu" }, { status: 409 });
        }

        // ─── Charger le pari avec ses entrées ────────────────────────────────
        const bet = await (prisma as any).bet.findUnique({
            where: { id },
            include: {
                entries: true
            }
        });

        if (!bet) {
            return NextResponse.json({ message: "Pari introuvable" }, { status: 404 });
        }
        if (bet.status !== "OPEN" && bet.status !== "LOCKED") {
            return NextResponse.json({ message: `Impossible de résoudre un pari en statut "${bet.status}" — statut OPEN ou LOCKED requis` }, { status: 400 });
        }

        // ─── Validation de l'option gagnante ─────────────────────────────────
        const options: Array<{ key: string; label: string }> = (() => {
            try { return JSON.parse(bet.options); } catch { return []; }
        })();
        const validKeys = options.map((o: any) => o.key);
        if (!validKeys.includes(winnerOption)) {
            return NextResponse.json({
                message: `Option invalide "${winnerOption}". Options valides : ${validKeys.join(", ")}`
            }, { status: 400 });
        }

        // ─── Guard : l'admin ne peut pas résoudre s'il a une mise active ─────
        const adminEntry = bet.entries.find((e: any) => e.userId === (session.user as any).id && !e.withdrawn);
        if (adminEntry) {
            return NextResponse.json({
                message: "Un admin ne peut pas résoudre un pari sur lequel il a misé"
            }, { status: 403 });
        }

        // ─── Calcul de la distribution ────────────────────────────────────────
        const distribution = calculateWinnings(bet.entries, winnerOption);
        const resolvedByUserId = (session.user as any).id;
        const today = getTodayISO();

        // ─── Transaction atomique ─────────────────────────────────────────────
        await (prisma as any).$transaction(async (tx: any) => {

            // 1. BetResult (clé unique betId garantit l'idempotence au niveau DB)
            await tx.betResult.create({
                data: {
                    betId: id,
                    winnerOption,
                    resolvedByUserId,
                    distributionSnapshot: JSON.stringify(distribution),
                    note: note || null,
                }
            });

            // 2. Mise à jour du Bet
            await tx.bet.update({
                where: { id },
                data: {
                    status: "RESOLVED",
                    resolvedOption: winnerOption,
                    resolvedAt: new Date(),
                    resolvedByUserId,
                }
            });

            // 3. Distribution des gains pour chaque gagnant
            for (const winner of distribution) {
                // XP
                await tx.xpAdjustment.create({
                    data: {
                        userId: winner.userId,
                        amount: winner.xpGain,
                        reason: `BET_WIN:${id}:${bet.title}`,
                        date: today,
                    }
                });
                // EC (Embercoins)
                if (winner.ecGain > 0) {
                    await tx.coinAdjustment.create({
                        data: {
                            userId: winner.userId,
                            amount: winner.ecGain,
                            reason: "BET_WIN",
                            refId: id,
                            date: today,
                        }
                    });
                }
            }

            // 4. BetEvent RESOLVE
            await tx.betEvent.create({
                data: {
                    betId: id,
                    userId: resolvedByUserId,
                    eventType: "RESOLVE",
                    metadata: JSON.stringify({
                        winnerOption,
                        distributionCount: distribution.length,
                    }),
                }
            });

        });

        const updatedBet = await (prisma as any).bet.findUnique({ where: { id } });

        return NextResponse.json({
            message: `Pari résolu — ${distribution.length} gagnant(s) récompensé(s)`,
            distribution,
            bet: { ...updatedBet, options },
        });

    } catch (error) {
        console.error("POST /api/bets/[id]/resolve error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
