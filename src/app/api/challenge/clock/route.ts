import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAllowedEncodingDates, is12thOfMonth } from "@/lib/challenge";

// DÉFI DE L'HORLOGE (Push-up Clock Challenge) — le 12 de chaque mois.
// Faire 1+2+…+12 = 78 pompes le plus VITE possible. Le score = le TEMPS total en SECONDES
// (minutes × 60 + secondes). Plus court = meilleur (classement inversé vs Sally).
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

        if (!is12thOfMonth(date)) {
            return NextResponse.json({ message: "Seulement le 12 du mois" }, { status: 403 });
        }

        const total = Math.max(0, Math.floor(Number(seconds) || 0));
        if (total <= 0) {
            return NextResponse.json({ message: "Temps invalide" }, { status: 400 });
        }

        const userId = session.user.id;

        // RÉ-ESSAIS : on garde le MEILLEUR essai (le PLUS RAPIDE). Un temps plus lent n'écrase
        // pas le record.
        const existing = await prisma.monthlyChallengeEntry.findUnique({
            where: { userId_date_type: { userId, date, type: "CLOCK_PUSHUP" } }
        });

        if (!existing) {
            await prisma.monthlyChallengeEntry.create({ data: { userId, date, type: "CLOCK_PUSHUP", seconds: total } });
            return NextResponse.json({ message: "Temps enregistré" });
        }

        if (total < existing.seconds) {
            await prisma.monthlyChallengeEntry.update({
                where: { userId_date_type: { userId, date, type: "CLOCK_PUSHUP" } },
                data: { seconds: total }
            });
            return NextResponse.json({ message: "Nouveau record !" });
        }

        const m = Math.floor(existing.seconds / 60), s = existing.seconds % 60;
        return NextResponse.json({ message: `Ton meilleur temps reste ${m}:${String(s).padStart(2, "0")}` });

    } catch (error) {
        console.error("Save Clock Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
