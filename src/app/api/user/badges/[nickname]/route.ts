import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getUserSummaries, getShowcaseData } from "@/lib/badges"

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
                sets: true,
                fines: true,
                sallyUps: true,
                badges: true
            }
        })

        if (!user) {
            return NextResponse.json({ message: "Utilisateur non trouvé" }, { status: 404 })
        }

        // 1. Get all users for context (competitive badges, although progress is for milestones)
        const allUsers = await prisma.user.findMany({
            include: { sets: true, fines: true, sallyUps: true }
        })

        const allEvents = await prisma.badgeEvent.findMany({
            where: { eventType: "STEAL" }
        })

        // 2. Calculate summary for the user
        const summaries = getUserSummaries(allUsers, allEvents)
        const userSummary = summaries.find(s => s.id === user.id)

        if (!userSummary) {
            return NextResponse.json({ message: "Erreur calcul summary" }, { status: 500 })
        }

        // 3. Get showcase data
        const earnedBadgeKeys = user.badges.map(b => b.badgeKey)
        const showcases = getShowcaseData(userSummary, earnedBadgeKeys)

        return NextResponse.json({ showcases })
    } catch (error) {
        console.error("Badges API Error:", error)
        return NextResponse.json({ message: "Erreur" }, { status: 500 })
    }
}
