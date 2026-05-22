import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateBadgesPostSave } from "@/lib/badges";
import { captureRepsSnapshot, detectRepsDropAndPenalize } from "@/lib/gamebook/antiCheat";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;

        if (!user?.isAdmin) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const { setId } = await req.json();

        if (!setId) {
            return NextResponse.json({ message: "ID manquant" }, { status: 400 });
        }

        // Find the user ID + date for this set before deleting (badge update + anti-cheat)
        const set = await (prisma as any).exerciseSet.findUnique({
            where: { id: setId },
            select: { userId: true, date: true }
        });

        if (!set) {
            return NextResponse.json({ message: "Série introuvable" }, { status: 404 });
        }

        // v3.6 — Snapshot AVANT delete pour détecter une baisse de reps
        const snapshot = await captureRepsSnapshot(set.userId, [set.date]);

        await (prisma as any).exerciseSet.delete({
            where: { id: setId }
        });

        // Trigger badge calculation for the affected user
        await updateBadgesPostSave(set.userId);

        // v3.6 — Détection anti-triche (admin exempté s'il agit sur un autre user)
        const cheatResult = await detectRepsDropAndPenalize(set.userId, snapshot, {
            actorUserId: user.id,
            actorIsAdmin: true,
        });

        return NextResponse.json({
            message: "Série supprimée avec succès",
            ...(cheatResult.triggered ? { gamebookPenaltyTriggered: true } : {}),
        });

    } catch (error) {
        console.error("Admin Delete Set Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
