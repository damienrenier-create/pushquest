import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const user = await (prisma.user as any).findUnique({
            where: { id: session.user.id },
            include: { alterEgo: true }
        });

        if (!user?.alterEgoId) {
            return NextResponse.json({ message: "Aucun Alter Ego trouvé" }, { status: 400 });
        }

        // Technically, the session is managed by NextAuth and stored in a cookie.
        // We cannot easily "swap" the id in the current session from the server-side POST route 
        // without the user re-authenticating or using a custom JWT solution.
        // HOWEVER, we can provide the new ID and let the client-side handle it if needed, 
        // or just respond that the account is ready to be switched.

        // A better approach for this app's "Alter Ego" is to allow a session-based 
        // "override" or just link them so that the client can request data for the other ID.
        // But the user's request was about "Alter Ego" as a mirror.

        // Let's assume for now we just return the Alter Ego ID and the client can decide how to use it.
        // Or we can implement a "Switch" by updating the session on the next request.

        return NextResponse.json({
            message: "Switch possible",
            targetId: user.alterEgoId,
            targetLeague: user.alterEgo.league
        });

    } catch (error) {
        console.error("Switch Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
