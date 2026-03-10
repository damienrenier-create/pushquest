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

        const { count, date } = await req.json()

        if (count === undefined || Number.isNaN(count) || count < 0) {
            return NextResponse.json({ message: "Nombre de pompes invalide" }, { status: 400 })
        }

        if (!date || typeof date !== "string") {
            return NextResponse.json({ message: "Date invalide" }, { status: 400 })
        }

        const userId = session.user.id;

        // Atomic delete and recreate for this specific date and exercise type
        const result = await prisma.$transaction(async (tx) => {
            await tx.exerciseSet.deleteMany({
                where: {
                    userId,
                    date: date,
                    exercise: "PUSHUP",
                },
            });

            return await tx.exerciseSet.create({
                data: {
                    userId,
                    date: date,
                    exercise: "PUSHUP",
                    reps: count,
                },
            });
        });

        return NextResponse.json({ log: result, message: "Pompes enregistrées pour aujourd'hui" }, { status: 200 })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { message: "Erreur lors de l'enregistrement des pompes" },
            { status: 500 }
        )
    }
}
