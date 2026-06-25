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
        const total = Math.max(0, Math.floor(Number(seconds) || 0));

        // RÉ-ESSAIS : on garde le MEILLEUR essai (Sally = le PLUS de reps). Un envoi inférieur
        // n'écrase pas le record.
        const existing = await prisma.monthlyChallengeEntry.findUnique({
            where: { userId_date_type: { userId, date, type: "SALLY_UP" } }
        });

        if (!existing) {
            await prisma.monthlyChallengeEntry.create({ data: { userId, date, type: "SALLY_UP", seconds: total } });
            return NextResponse.json({ message: "Performance enregistrée" });
        }

        if (total > existing.seconds) {
            await prisma.monthlyChallengeEntry.update({
                where: { userId_date_type: { userId, date, type: "SALLY_UP" } },
                data: { seconds: total }
            });
            return NextResponse.json({ message: `Nouveau record : ${total} reps !` });
        }

        return NextResponse.json({ message: `Ton meilleur reste ${existing.seconds} reps` });

    } catch (error) {
        console.error("Save Sally Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
