import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTodayISO, getDailyTargetForUserOnDate } from "@/lib/challenge";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const userId = session.user.id;
        const todayISO = getTodayISO();

        const user = await (prisma.user as any).findUnique({
            where: { id: userId },
            select: {
                id: true,
                onboardingStartedAt: true,
                createdAt: true,
                buyoutPaid: true,
                medicalCertificates: {
                    where: {
                        startDateISO: { lte: todayISO },
                        endDateISO: { gte: todayISO }
                    }
                },
                sets: {
                    where: { date: todayISO }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ message: "Utilisateur non trouvé" }, { status: 404 });
        }

        const requiredReps = getDailyTargetForUserOnDate(user, todayISO);
        
        const currentTotal = (user.sets || []).reduce((sum: number, s: any) => {
            const effort = s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps;
            return sum + effort;
        }, 0);

        return NextResponse.json({
            todayISO,
            requiredReps,
            currentTotal,
            isInjured: (user.medicalCertificates || []).length > 0,
            isVeteran: user.buyoutPaid
        });

    } catch (error) {
        console.error("Dashboard Quick Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
