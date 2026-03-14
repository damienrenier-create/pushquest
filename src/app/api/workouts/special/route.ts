import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 })
        }

        const { workoutId, data, completionTime, date } = await req.json()

        if (!workoutId || !data || !date) {
            return NextResponse.json({ message: "Données manquantes" }, { status: 400 })
        }

        const userId = session.user.id;

        // 1. Save or Update the workout entry
        const entry = await prisma.specialWorkoutEntry.upsert({
            where: { userId_workoutId: { userId, workoutId } },
            create: {
                userId,
                workoutId,
                data,
                completionTime,
                date,
                totalScore: completionTime ? -completionTime : 0
            },
            update: {
                data,
                completionTime,
                date,
                totalScore: completionTime ? -completionTime : 0
            }
        });

        // 2. Dynamic Badge Keys
        const participationBadgeKey = `workout_${workoutId}_std`;
        const platinumBadgeKey = `workout_${workoutId}_plat`;

        // 3. Assign Participation Badge (everyone who completes it)
        // Note: Special badge keys are used, which may not exist in static BadgeDefinition
        // but BadgeOwnership can still store them.
        await prisma.badgeOwnership.upsert({
            where: {
                badgeKey: participationBadgeKey
            },
            create: {
                badgeKey: participationBadgeKey,
                currentUserId: userId,
                currentValue: 1,
                achievedAt: new Date()
            },
            update: {} // Basic participation doesn't change once achieved
        });

        // 4. Handle Platinum Badge (Record Holder - Transferable)
        const bestEntry = await prisma.specialWorkoutEntry.findFirst({
            where: { workoutId },
            orderBy: { totalScore: 'desc' }
        });

        if (bestEntry && bestEntry.userId === userId) {
            // Update or Reassign the record badge to the current winner
            await prisma.badgeOwnership.upsert({
                where: {
                    badgeKey: platinumBadgeKey
                },
                create: {
                    badgeKey: platinumBadgeKey,
                    currentUserId: userId,
                    currentValue: entry.totalScore || 0,
                    achievedAt: new Date()
                },
                update: {
                    currentUserId: userId,
                    currentValue: entry.totalScore || 0,
                    achievedAt: new Date()
                }
            });
        }

        return NextResponse.json({ 
            entry, 
            message: "Entraînement et badges mis à jour avec succès !" 
        }, { status: 200 })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { message: "Erreur lors de l'enregistrement de l'entraînement" },
            { status: 500 }
        )
    }
}
