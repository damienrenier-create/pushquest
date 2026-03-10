import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAllowedEncodingDates, isLastDayOfMonth } from "@/lib/challenge";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const body = await req.json();
        const { date, seconds } = body;

        const allowedDates = getAllowedEncodingDates();
        if (!allowedDates.includes(date)) {
            return NextResponse.json({ message: "Date non autorisée" }, { status: 403 });
        }

        if (!isLastDayOfMonth(date)) {
            return NextResponse.json({ message: "Seulement le dernier jour du mois" }, { status: 403 });
        }

        const userId = session.user.id;

        await prisma.monthlyChallengeEntry.upsert({
            where: {
                userId_date_type: { userId, date, type: "SALLY_UP" }
            },
            update: { seconds },
            create: { userId, date, type: "SALLY_UP", seconds }
        });

        return NextResponse.json({ message: "Performance enregistrée" });

    } catch (error) {
        console.error("Save Sally Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
