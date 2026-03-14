import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const workoutId = searchParams.get("workoutId")

        if (!workoutId) {
            return NextResponse.json({ message: "workoutId manquant" }, { status: 400 })
        }

        // Fetch top 5 scores for this workout
        const ranking = await prisma.specialWorkoutEntry.findMany({
            where: { workoutId },
            include: {
                user: {
                    select: {
                        nickname: true
                    }
                }
            },
            orderBy: {
                totalScore: "desc"
            },
            take: 5
        })

        return NextResponse.json({ ranking }, { status: 200 })
    } catch (error) {
        console.error("Erreur API Ranking:", error)
        return NextResponse.json(
            { message: "Erreur lors de la récupération du classement" },
            { status: 500 }
        )
    }
}
