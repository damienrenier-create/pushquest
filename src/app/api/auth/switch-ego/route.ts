import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * Special route to switch context to an Alter Ego profile.
 * Instead of complex session manipulation, we just verify the link
 * and return a token/signal for the frontend to re-signin or we 
 * use a redirect to the signin with the new identifier.
 * 
 * However, since the user doesn't want to re-type a password (even if it's 3 chars),
 * and the app uses a custom Credentials provider that just checks length,
 * we can actually just perform a "Switch" by providing the new identity.
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const user = await (prisma.user as any).findUnique({
            where: { id: session.user.id },
            select: { league: true }
        });

        if (!user) {
            return NextResponse.json({ message: "Utilisateur introuvable" }, { status: 404 });
        }

        const newLeague = user.league === "GAINAGE" ? "POMPES" : "GAINAGE";

        await (prisma.user as any).update({
            where: { id: session.user.id },
            data: { league: newLeague }
        });

        return NextResponse.json({
            success: true,
            newLeague
        });
    } catch (error) {
        console.error("Toggle League Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
