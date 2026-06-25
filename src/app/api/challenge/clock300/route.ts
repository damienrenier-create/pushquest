import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAllowedEncodingDates, isClock300Window, clock300CanonicalDate } from "@/lib/challenge";

// DÉFI DES 300 (Les 24 Heures de l'Horloge) — version ultime du Défi de l'Horloge.
// Faire 1+2+…+24 = 300 pompes le plus VITE possible, autour du 300e jour de l'année.
// Fenêtre d'encodage : jours 297→300 (2026 : 24-27 octobre). Score = TEMPS total en SECONDES.
// Plus court = meilleur. On stocke sous la DATE CANONIQUE (jour 300) → 1 entrée par joueur,
// peu importe le jour d'encodage dans la fenêtre.
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

        if (!isClock300Window(date)) {
            return NextResponse.json({ message: "Hors fenêtre du Défi des 300" }, { status: 403 });
        }

        const total = Math.max(0, Math.floor(Number(seconds) || 0));
        if (total <= 0) {
            return NextResponse.json({ message: "Temps invalide" }, { status: 400 });
        }

        const userId = session.user.id;
        const canon = clock300CanonicalDate(parseInt(date.slice(0, 4), 10));

        // RÉ-ESSAIS : on garde le MEILLEUR essai (le PLUS RAPIDE). Un temps plus lent n'écrase
        // pas le record.
        const existing = await prisma.monthlyChallengeEntry.findUnique({
            where: { userId_date_type: { userId, date: canon, type: "CLOCK_300" } }
        });

        if (!existing) {
            await prisma.monthlyChallengeEntry.create({ data: { userId, date: canon, type: "CLOCK_300", seconds: total } });
            return NextResponse.json({ message: "Temps enregistré" });
        }

        if (total < existing.seconds) {
            await prisma.monthlyChallengeEntry.update({
                where: { userId_date_type: { userId, date: canon, type: "CLOCK_300" } },
                data: { seconds: total }
            });
            return NextResponse.json({ message: "Nouveau record !" });
        }

        const m = Math.floor(existing.seconds / 60), s = existing.seconds % 60;
        return NextResponse.json({ message: `Ton meilleur temps reste ${m}:${String(s).padStart(2, "0")}` });

    } catch (error) {
        console.error("Save Clock300 Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
