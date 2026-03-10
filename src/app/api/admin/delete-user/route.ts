import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateBadgesPostSave } from "@/lib/badges";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.isAdmin) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const body = await req.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ message: "userId manquant" }, { status: 400 });
        }

        // Prevent self-deletion
        if (userId === (session?.user as any).id) {
            return NextResponse.json({ message: "Impossible de supprimer votre propre compte" }, { status: 403 });
        }

        // Check if user exists
        const targetUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!targetUser) {
            return NextResponse.json({ message: "Utilisateur introuvable" }, { status: 404 });
        }

        // The Prisma schema handles cascading deletes for ExerciseSet, FineRecord, etc.
        // However, we want to capture the user's sets and badges first, to know if we need to 
        // trigger a global update to re-evaluate competitively held badges.

        await prisma.user.delete({
            where: { id: userId }
        });

        // Trigger a global refresh to re-evaluate the leaderboards and badges
        // We can just pass the admin's ID or anyone's ID to force an evaluation sweep
        await updateBadgesPostSave((session!.user as any).id);

        return NextResponse.json({ message: "Utilisateur supprimé avec succès" });
    } catch (error) {
        console.error("Delete User Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
