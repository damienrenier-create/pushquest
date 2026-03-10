import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;

        // Fetch recent STEAL events where the CURRENT user was the VICTIM (fromUserId)
        const recentSteals = await (prisma as any).badgeEvent.findMany({
            where: {
                eventType: "STEAL",
                fromUserId: userId,
                // Only get events from the last 7 days to avoid flooding
                createdAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                }
            },
            include: {
                badge: true,
                toUser: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 3
        });

        return NextResponse.json({ events: recentSteals });
    } catch (error) {
        console.error("Error fetching stolen badges:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
