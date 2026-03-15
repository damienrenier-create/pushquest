import { NextResponse } from "next/server";
import { updateBadgesPostSave } from "@/lib/badges";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // Trigger for a random real user to refresh everything
        const someUser = await (prisma as any).user.findFirst({
            where: { nickname: { not: 'modo' } }
        });

        if (!someUser) {
            return NextResponse.json({ message: "Aucun utilisateur trouvé" }, { status: 404 });
        }

        console.log("Forcing full badge update via user:", someUser.nickname);
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
