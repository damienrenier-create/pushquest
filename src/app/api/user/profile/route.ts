import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                medicalCertificates: true
            }
        })

        if (!user) {
            return NextResponse.json({ message: "Utilisateur non trouvé" }, { status: 404 })
        }

        // Fetch personal records
        const records = await prisma.exerciseSet.groupBy({
            by: ['exercise'],
            where: { userId: user.id },
            _max: { reps: true }
        })

        return NextResponse.json({
            nickname: user.nickname,
            email: user.email,
            buyoutPaid: user.buyoutPaid,
            medicalCertificates: user.medicalCertificates,
            records: {
                pushups: records.find(r => r.exercise === "PUSHUP")?._max.reps || 0,
                pullups: records.find(r => r.exercise === "PULLUP")?._max.reps || 0,
                squats: records.find(r => r.exercise === "SQUAT")?._max.reps || 0,
            }
        })
    } catch (error) {
        return NextResponse.json({ message: "Erreur" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 })
        }

        const { nickname } = await req.json()

        if (!nickname || nickname.trim().length === 0) {
            return NextResponse.json({ message: "Le surnom est requis." }, { status: 400 })
        }

        const updatedUser = await prisma.user.update({
            where: { email: session.user.email },
            data: { nickname: nickname.trim() },
            select: {
                id: true,
                nickname: true,
                email: true,
            }
        })

        return NextResponse.json({ user: updatedUser, message: "Profil mis à jour" })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { message: "Erreur lors de la mise à jour du profil" },
            { status: 500 }
        )
    }
}
