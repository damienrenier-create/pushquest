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

        const { setId } = await req.json();

        if (!setId) {
            return NextResponse.json({ message: "ID manquant" }, { status: 400 });
        }

        // Find the user ID for this set before deleting to trigger badge update
        const set = await (prisma as any).exerciseSet.findUnique({
            where: { id: setId },
            select: { userId: true }
        });

        if (!set) {
            return NextResponse.json({ message: "Série introuvable" }, { status: 404 });
        }

        await (prisma as any).exerciseSet.delete({
            where: { id: setId }
        });

        // Trigger badge calculation for the affected user
        await updateBadgesPostSave(set.userId);

        return NextResponse.json({ message: "Série supprimée avec succès" });

    } catch (error) {
        console.error("Admin Delete Set Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
