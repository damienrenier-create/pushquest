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

        const globalOwnerships = await prisma.badgeOwnership.findMany({
            include: { currentUser: true }
        });

        // 3. Get showcase data
        const { getXPForReward } = require("@/lib/rewards");
        const earnedBadgeKeys = user.badges.map(b => b.badgeKey);
        let showcases = getShowcaseData(userSummary, earnedBadgeKeys);

        // Add XP to badges
        showcases = showcases.map(cat => ({
            ...cat,
            earned: cat.earned.map((b: any) => ({ ...b, xp: getXPForReward(b.key) })),
            pending: cat.pending.map((b: any) => ({ ...b, xp: getXPForReward(b.key) }))
        }));

        return NextResponse.json({ showcases, badgeOwnerships: user.badges, globalOwnerships })
    } catch (error) {
        console.error("Badges API Error:", error)
        return NextResponse.json({ message: "Erreur" }, { status: 500 })
    }
}
