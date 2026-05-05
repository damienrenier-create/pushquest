import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTodayISO } from "@/lib/challenge";

export const dynamic = "force-dynamic";

// ─── GET — Mes modifications à venir ─────────────────────────────────────────

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }
        const userId = (session.user as any).id;
        const today = getTodayISO();

        // Les modifications que j'ai achetées (pour moi ou pour d'autres)
        const given = await (prisma as any).quotaModifier.findMany({
            where: {
                sourceUserId: userId,
                status: "PENDING",
                targetDateISO: { gte: today },
            },
            include: {
                sourceUser: { select: { nickname: true } },
                targetUser: { select: { nickname: true } },
            },
            orderBy: { targetDateISO: "asc" },
        });

        // Les modifications que j'ai reçues (achetées par moi ou par d'autres pour moi)
        const received = await (prisma as any).quotaModifier.findMany({
            where: {
                targetUserId: userId,
                status: "PENDING",
                targetDateISO: { gte: today },
            },
            include: {
                sourceUser: { select: { nickname: true } },
                targetUser: { select: { nickname: true } },
            },
            orderBy: { targetDateISO: "asc" },
        });

        // Dédupliquer si j'ai acheté une réduction pour moi-même
        // (elle apparaîtrait dans `given` ET dans `received`)
        const receivedDeduped = received.filter((r: any) => 
            !given.some((g: any) => g.id === r.id)
        );

        return NextResponse.json({
            given,
            received: receivedDeduped,
        });

    } catch (error) {
        console.error("GET /api/quota-modifiers/pending error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
