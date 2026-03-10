import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const resolvedParams = await params;
        const { eventId } = resolvedParams;

        // Check if like exists
        const existingLike = await (prisma as any).badgeEventLike.findUnique({
            where: {
                eventId_userId: {
                    eventId,
                    userId
                }
            }
        });

        if (existingLike) {
            // Unlike
            await (prisma as any).badgeEventLike.delete({
                where: { id: existingLike.id }
            });
            return NextResponse.json({ action: "unliked" });
        } else {
            // Like
            await (prisma as any).badgeEventLike.create({
                data: {
                    eventId,
                    userId
                }
            });
            return NextResponse.json({ action: "liked" });
        }
    } catch (error) {
        console.error("Error toggling like:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
