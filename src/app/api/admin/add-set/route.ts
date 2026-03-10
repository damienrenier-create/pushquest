import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateBadgesPostSave } from "@/lib/badges";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;

        if (!user?.isAdmin) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const { userId, date, exercise, reps } = await req.json();

        if (!userId || !date || !exercise || !reps || Number(reps) <= 0) {
            return NextResponse.json({ message: "Champs manquants ou invalides" }, { status: 400 });
        }

        const targetUser = await (prisma as any).user.findUnique({
            where: { id: userId }
        });

        if (!targetUser) {
            return NextResponse.json({ message: "Utilisateur cible introuvable" }, { status: 404 });
        }

        await (prisma as any).exerciseSet.create({
            data: {
                userId,
                date,
                exercise,
                reps: Number(reps)
            }
        });

        // Trigger badge calculation for the affected user
        await updateBadgesPostSave(userId);

        return NextResponse.json({ message: "Série ajoutée avec succès" });

    } catch (error) {
        console.error("Admin Add Set Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
