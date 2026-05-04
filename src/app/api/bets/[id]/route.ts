import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { calculateOddsDisplay } from "@/lib/bets";

export const dynamic = "force-dynamic";

// ─── GET — Détail d'un pari ───────────────────────────────────────────────────

export async function GET(
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

        const bet = await (prisma as any).bet.findUnique({
            where: { id },
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
                        withdrawnAt: true,
                        xpReturned: true,
                        ecReturned: true,
                        placedAt: true,
                    }
                },
                result: true,
            }
        });

        if (!bet) {
            return NextResponse.json({ message: "Pari introuvable" }, { status: 404 });
        }

        const options = (() => {
            try { return JSON.parse(bet.options); } catch { return []; }
        })();

        const now = new Date();

        const totalPool = bet.entries.reduce((sum: number, e: any) => sum + e.xpStaked, 0)
            - bet.entries.reduce((sum: number, e: any) => sum + (e.xpReturned || 0), 0);

        const oddsDisplay = (bet.status === "OPEN" || bet.status === "LOCKED") && bet.openAt && bet.closeAt
            ? calculateOddsDisplay(options, bet.entries, new Date(bet.openAt), new Date(bet.closeAt), now)
            : [];

        const myEntry = bet.entries.find((e: any) => e.userId === userId) || null;

        return NextResponse.json({
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
            resolvedByUserId: bet.resolvedByUserId,
            createdByUserId: bet.createdByUserId,
            targetUserId: bet.targetUserId,
            metadata: bet.metadata,
            createdAt: bet.createdAt,
            updatedAt: bet.updatedAt,
            entries: bet.entries,
            totalPool,
            oddsDisplay,
            myEntry,
            result: bet.result || null,
        });

    } catch (error) {
        console.error("GET /api/bets/[id] error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
