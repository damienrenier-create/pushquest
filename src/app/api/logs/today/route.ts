import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTodayISO, getRequiredRepsForDate, getAllowedEncodingDates } from "@/lib/challenge";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const { sets, date } = await req.json();
        const today = getTodayISO();
        const targetDate = date || today;

        // Validate date range (today up to J-3)
        const allowedDates = getAllowedEncodingDates();
        if (!allowedDates.includes(targetDate)) {
            return NextResponse.json({ message: "Date hors plage (Max J-3)" }, { status: 400 });
        }

        if (!sets) {
            return NextResponse.json({ message: "Données de séries manquantes" }, { status: 400 });
        }

        const userId = session.user.id;
        const requiredReps = getRequiredRepsForDate(targetDate);

        // 1. Prepare new sets
        const newSetsData: any[] = [];

        const processExo = (exoSets: number[], type: string) => {
            if (Array.isArray(exoSets)) {
                exoSets.forEach((reps) => {
                    const val = Math.min(500, Math.max(0, Number(reps) || 0));
                    if (val > 0) {
                        newSetsData.push({
                            userId,
                            date: targetDate,
                            exercise: type,
                            reps: val,
                        });
                    }
                });
            }
        };

        processExo(sets.pushups, "PUSHUP");
        processExo(sets.pullups, "PULLUP");
        processExo(sets.squats, "SQUAT");

        // 2. atomic delete and recreate sets for that user and that date
        await prisma.$transaction([
            prisma.exerciseSet.deleteMany({
                where: { userId, date: targetDate },
            }),
            prisma.exerciseSet.createMany({
                data: newSetsData,
            }),
        ]);

        // 3. Calculate stats for response
        const totals = {
            pushups: sets.pushups?.reduce((a: number, b: number) => a + (Number(b) || 0), 0) || 0,
            pullups: sets.pullups?.reduce((a: number, b: number) => a + (Number(b) || 0), 0) || 0,
            squats: sets.squats?.reduce((a: number, b: number) => a + (Number(b) || 0), 0) || 0,
        };
        const totalGlobal = totals.pushups + totals.pullups + totals.squats;
        const isComplete = totalGlobal >= requiredReps;

        const formattedDate = targetDate.split('-').reverse().join('/');

        return NextResponse.json({
            message: `Enregistré pour le ${formattedDate}`,
            requiredReps,
            totals,
            totalGlobal,
            isComplete,
            date: targetDate
        });
    } catch (error) {
        console.error("Error saving sets:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
