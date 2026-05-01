import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateBadgesPostSave, initBadges } from "@/lib/badges";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.isAdmin) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        // Trigger for a random real user to refresh everything
        const someUser = await (prisma as any).user.findFirst({
            where: { nickname: { not: 'modo' } }
        });

        if (!someUser) {
            return NextResponse.json({ message: "Aucun utilisateur trouvé" }, { status: 404 });
        }

        console.log("Forcing full badge update via user:", someUser.nickname);
        await initBadges();
        await updateBadgesPostSave(someUser.id);

        return NextResponse.json({ 
            message: "Mise à jour des badges terminée avec succès 🚀",
            triggeredBy: someUser.nickname 
        });
    } catch (error: any) {
        console.error("Force Badges Error:", error);
        return NextResponse.json({ message: "Erreur lors de la mise à jour", error: error.message }, { status: 500 });
    }
}
