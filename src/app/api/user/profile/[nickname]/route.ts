import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"

export const dynamic = "force-dynamic"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ nickname: string }> }
) {
    try {
        const { nickname } = await params
        const decodedNickname = decodeURIComponent(nickname)

        const user = await prisma.user.findFirst({
            where: { nickname: { equals: decodedNickname, mode: "insensitive" } },
            include: {
                badges: {
                    include: {
                        badge: true
                    },
                    orderBy: {
                        achievedAt: "desc"
                    }
                },
                fines: {
                    orderBy: { date: "desc" },
                    take: 20
                },
                medicalCertificates: {
                    where: {
                        endDateISO: { gte: getTodayISO() }
                    }
                }
            }
        })

        if (!user) {
            return NextResponse.json({ message: "Utilisateur non trouvé" }, { status: 404 })
        }

        // Fetch stats
        const statsGroup = await prisma.exerciseSet.groupBy({
            by: ['exercise'],
            where: { userId: user.id },
            _sum: { reps: true }
        })

        const pushups = statsGroup.find(s => s.exercise === "PUSHUP")?._sum.reps || 0
        const pullups = statsGroup.find(s => s.exercise === "PULLUP")?._sum.reps || 0
        const squats = statsGroup.find(s => s.exercise === "SQUAT")?._sum.reps || 0

        return NextResponse.json({
            nickname: user.nickname,
            createdAt: user.createdAt,
            buyoutPaid: user.buyoutPaid,
            badges: user.badges,
            fines: user.fines.map((f: any) => ({
                id: f.id,
                amountEur: f.amountEur,
                date: f.date,
                status: f.status
            })),
            medicalCertificates: user.medicalCertificates,
            stats: {
                pushups,
                pullups,
                squats,
                total: pushups + pullups + squats
            }
        })
    } catch (error) {
        console.error("Public Profile API Error:", error)
        return NextResponse.json({ message: "Erreur" }, { status: 500 })
    }
}
