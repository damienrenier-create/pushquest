import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.isAdmin) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const body = await req.json();
        const { userId, nickname, buyoutPaid, league, alterEgoId } = body;

        if (!userId) {
            return NextResponse.json({ message: "userId manquant" }, { status: 400 });
        }

        if (nickname) {
            const existing = await (prisma.user as any).findFirst({
                where: { nickname, NOT: { id: userId } }
            });
            if (existing) {
                return NextResponse.json({ message: "Surnom déjà pris" }, { status: 400 });
            }
        }

        await (prisma.user as any).update({
            where: { id: userId },
            data: {
                nickname,
                buyoutPaid,
                buyoutPaidAt: buyoutPaid ? new Date() : null,
                league,
                alterEgoId: alterEgoId || null
            }
        });

        return NextResponse.json({ message: "Utilisateur mis à jour" });
    } catch (error) {
        console.error("Update User Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
