
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

        const { badgeKey, toUserId, message, category } = await req.json();

        if (!badgeKey || !toUserId || !message) {
            return NextResponse.json({ message: "Données manquantes" }, { status: 400 });
        }

        // Create the reaction event
        const newEvent = await (prisma as any).badgeEvent.create({
            data: {
                badgeKey,
                fromUserId: session.user.id,
                toUserId,
                eventType: "STEAL_REACTION",
                metadata: JSON.stringify({ message, category })
            }
        });

        return NextResponse.json(newEvent, { status: 201 });

    } catch (error) {
        console.error("Badge Reaction Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
