import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTodayISO } from "@/lib/challenge";

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const userId = session.user.id;

        const user = await (prisma.user as any).findUnique({
            where: { id: userId },
            select: { buyoutPaid: true }
        });

        if (user?.buyoutPaid) {
            return NextResponse.json({ message: "Buyout déjà payé" }, { status: 400 });
        }

        await (prisma as any).$transaction([
            (prisma.user as any).update({
                where: { id: userId },
                data: {
                    buyoutPaid: true,
                    buyoutPaidAt: new Date()
                }
            }),
            (prisma.potEvent as any).create({
                data: {
                    type: "BUYOUT",
                    amountEur: 50,
                    userId,
                    date: getTodayISO()
                }
            })
        ]);

        return NextResponse.json({ message: "Buyout effectué avec succès" });
    } catch (error) {
        console.error("Buyout Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
