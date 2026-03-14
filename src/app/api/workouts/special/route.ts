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

        // Save the special workout entry
        // We use an upsert-like logic: if user already has an entry for this workout, update it
        const result = await prisma.specialWorkoutEntry.upsert({
            where: {
                userId_workoutId: {
                    userId,
                    workoutId
                }
            },
            create: {
                userId,
                workoutId,
                data,
                completionTime,
                date,
                totalScore: completionTime ? -completionTime : 0 // Negative time for easier sorting (smaller time is better)
            },
            update: {
                data,
                completionTime,
                date,
                totalScore: completionTime ? -completionTime : 0
            }
        });

        return NextResponse.json({ 
            entry: result, 
            message: "Entraînement enregistré avec succès !" 
        }, { status: 200 })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { message: "Erreur lors de l'enregistrement de l'entraînement" },
            { status: 500 }
        )
    }
}
