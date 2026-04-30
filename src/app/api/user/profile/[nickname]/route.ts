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
        const decodedNickname = decodeURIComponent(nickname).trim()

        // Re-try with different variations if needed
        const user = await (prisma.user as any).findFirst({
            where: {
                OR: [
                    { nickname: { equals: decodedNickname, mode: "insensitive" } },
                    { nickname: { equals: nickname.trim(), mode: "insensitive" } }
                ]
            },
            include: {
                sets: true,
                statuses: {
                    include: {
                        likes: {
                            select: { userId: true }
                        }
                    },
                    orderBy: { createdAt: "desc" },
                    take: 1
                },
                badges: {
                    include: {
                        badge: true,
                        likes: {
                            include: {
                                user: {
                                    select: { nickname: true }
                                }
                            }
                        }
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
            const allCount = await prisma.user.count();
            return NextResponse.json({
                message: "Utilisateur non trouvé",
                searched: decodedNickname,
                original: nickname,
                totalUsersInDB: allCount
            }, { status: 404 })
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
        const planks = statsGroup.find(s => s.exercise === "PLANK")?._sum.reps || 0

        const { getUserSummaries } = require("@/lib/badges");
        const { summaries } = getUserSummaries([user], []);
        const summary = summaries[0];

        return NextResponse.json({
            id: (user as any).id,
            nickname: (user as any).nickname,
            image: (user as any).image,
            createdAt: (user as any).createdAt,
            buyoutPaid: (user as any).buyoutPaid,
            badges: (user as any).badges,
            status: (user as any).statuses[0] || null,
            currentPerfectStreak: summary?.currentPerfectStreak || 0,
            fines: (user as any).fines.map((f: any) => ({
                id: f.id,
                amountEur: f.amountEur,
                date: f.date,
                status: f.status
            })),
            medicalCertificates: (user as any).medicalCertificates,
            stats: {
                pushups,
                pullups,
                squats,
                planks,
                total: pushups + pullups + squats + Math.floor(planks / 5)
            }
        })
    } catch (error: any) {
        console.error("Public Profile API Error:", error)
        return NextResponse.json({
            message: "Erreur serveur",
            error: error.message,
            stack: error.stack
        }, { status: 500 })
    }
}
