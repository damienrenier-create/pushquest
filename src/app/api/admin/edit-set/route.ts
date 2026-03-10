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

        const { setId, date, exercise, reps } = await req.json();

        if (!setId || !date || !exercise || reps === undefined || reps === null) {
            return NextResponse.json({ message: "Champs manquants" }, { status: 400 });
        }

        const set = await (prisma as any).exerciseSet.findUnique({
            where: { id: setId }
        });

        if (!set) {
            return NextResponse.json({ message: "Série introuvable" }, { status: 404 });
        }

        await (prisma as any).exerciseSet.update({
            where: { id: setId },
            data: {
                date,
                exercise,
                reps: Number(reps)
            }
        });

        // Trigger badge calculation for the affected user
        // We pass the set.userId because it's the target user, not the admin.
        await updateBadgesPostSave(set.userId);

        return NextResponse.json({ message: "Série modifiée avec succès" });

    } catch (error) {
        console.error("Admin Edit Set Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
