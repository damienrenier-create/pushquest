import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTodayISO, getRequiredRepsForDate } from "@/lib/challenge";
import { calculateQuotaModifierCost } from "@/lib/coins";

export const dynamic = "force-dynamic";

// ─── POST — Acheter un QuotaModifier ─────────────────────────────────────────

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }
        const userId = (session.user as any).id;

        const body = await req.json();
        const { type, targetUserId, targetDateISO, reps } = body;

        if (!type || !targetUserId || !targetDateISO || !reps) {
            return NextResponse.json({ message: "Paramètres manquants" }, { status: 400 });
        }

        if (type !== "REDUCE_SELF" && type !== "INCREASE_OTHER") {
            return NextResponse.json({ message: "type invalide" }, { status: 400 });
        }
        if (typeof reps !== "number" || reps <= 0 || !Number.isInteger(reps)) {
            return NextResponse.json({ message: "reps doit être un entier positif" }, { status: 400 });
        }
        if (targetDateISO <= getTodayISO()) {
            return NextResponse.json({ message: "La date cible doit être dans le futur" }, { status: 400 });
        }
        if (type === "REDUCE_SELF" && targetUserId !== userId) {
            return NextResponse.json({ message: "Vous ne pouvez réduire que votre propre quota" }, { status: 403 });
        }
        if (type === "INCREASE_OTHER" && targetUserId === userId) {
            return NextResponse.json({ message: "Vous ne pouvez pas augmenter votre propre quota" }, { status: 403 });
        }

        const { ecCost, demandMultiplier, baseEcPerRep } = await calculateQuotaModifierCost(userId, targetUserId, reps);

        let finalModifier: any;
        let newBalance = 0;

        // ─── Transaction atomique ─────────────────────────────────────────────
        await (prisma as any).$transaction(async (tx: any) => {

            // a. Vérifier solde EC dans la transaction
            const adjustments = await tx.coinAdjustment.findMany({ where: { userId } });
            const balance = adjustments.reduce((s: number, a: any) => s + a.amount, 0);
            if (balance < ecCost) {
                throw new Error("EC_INSUFFICIENT");
            }

            // b. Calculer repsDelta
            const repsDelta = type === "REDUCE_SELF" ? -reps : +reps;

            // c. Vérifier le plafond pour INCREASE_OTHER
            let effectiveReps = reps;
            if (type === "INCREASE_OTHER") {
                const standardTarget = getRequiredRepsForDate(targetDateISO);
                const maxTarget = standardTarget * 2;
                
                const existingModifiers = await tx.quotaModifier.findMany({
                    where: { targetUserId, targetDateISO, status: "PENDING" }
                });
                const existingDelta = existingModifiers.reduce((s: number, m: any) => s + m.repsDelta, 0);
                
                effectiveReps = Math.min(reps, Math.max(0, standardTarget - existingDelta));
                if (effectiveReps === 0) {
                    throw new Error("QUOTA_MAX_REACHED");
                }
            }

            const effectiveRepsDelta = type === "REDUCE_SELF" ? -effectiveReps : +effectiveReps;

            // d. Créer QuotaModifier
            finalModifier = await tx.quotaModifier.create({
                data: {
                    type,
                    sourceUserId: userId,
                    targetUserId,
                    targetDateISO,
                    repsDelta: effectiveRepsDelta,
                    ecCost,
                    baseEcPerRep,
                    demandMultiplier,
                    status: "PENDING",
                }
            });

            // e. Créer CoinAdjustment négatif
            await tx.coinAdjustment.create({
                data: {
                    userId,
                    amount: -ecCost,
                    reason: "QUOTA_MODIFIER",
                    refId: finalModifier.id,
                    date: getTodayISO(),
                }
            });

            newBalance = balance - ecCost;
        });

        return NextResponse.json({
            message: "Quota modifié avec succès",
            quotaModifier: finalModifier,
            ecCost,
            newBalance,
        });

    } catch (error: any) {
        if (error.message === "EC_INSUFFICIENT") {
            return NextResponse.json({ message: "Solde EC insuffisant" }, { status: 400 });
        }
        if (error.message === "QUOTA_MAX_REACHED") {
            return NextResponse.json({ message: "Plafond atteint pour cette date (maximum 2x le quota standard)" }, { status: 400 });
        }
        console.error("POST /api/quota-modifiers error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
