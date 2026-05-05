import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCoinBalance } from "@/lib/coins";

export const dynamic = "force-dynamic";

// ─── GET — Solde et historique Embercoins ────────────────────────────────────

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }
        const userId = (session.user as any).id;

        const balance = await getCoinBalance(userId);

        const history = await (prisma as any).coinAdjustment.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        return NextResponse.json({
            balance,
            history,
        });

    } catch (error) {
        console.error("GET /api/coins error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
