import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTodayISO } from "@/lib/challenge";
import { calculateQuotaModifierCost, getCoinBalance } from "@/lib/coins";

export const dynamic = "force-dynamic";

// ─── GET — Preview du coût avant achat ───────────────────────────────────────

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }
        const userId = (session.user as any).id;

        const { searchParams } = new URL(req.url);
        const targetUserId = searchParams.get("targetUserId");
        const repsParam = searchParams.get("reps");
        const type = searchParams.get("type");
        const date = searchParams.get("date");

        if (!targetUserId || !repsParam || !type || !date) {
            return NextResponse.json({ message: "Paramètres manquants" }, { status: 400 });
        }

        const reps = parseInt(repsParam, 10);

        if (type !== "REDUCE_SELF" && type !== "INCREASE_OTHER") {
            return NextResponse.json({ message: "type invalide" }, { status: 400 });
        }
        if (isNaN(reps) || reps <= 0) {
            return NextResponse.json({ message: "reps doit être > 0" }, { status: 400 });
        }
        if (date <= getTodayISO()) {
            return NextResponse.json({ message: "La date doit être dans le futur" }, { status: 400 });
        }
        if (type === "REDUCE_SELF" && targetUserId !== userId) {
            return NextResponse.json({ message: "Vous ne pouvez réduire que votre propre quota" }, { status: 403 });
        }
        if (type === "INCREASE_OTHER" && targetUserId === userId) {
            return NextResponse.json({ message: "Vous ne pouvez pas augmenter votre propre quota" }, { status: 403 });
        }

        const { ecCost, demandMultiplier, baseEcPerRep } = await calculateQuotaModifierCost(userId, targetUserId, reps);
        const balance = await getCoinBalance(userId);
        const canAfford = balance >= ecCost;

        return NextResponse.json({
            ecCost,
            demandMultiplier,
            baseEcPerRep,
            balance,
            canAfford,
            reps,
            type,
            targetDateISO: date
        });

    } catch (error) {
        console.error("GET /api/quota-modifiers/preview error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
