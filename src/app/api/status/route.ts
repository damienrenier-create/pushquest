import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/status - Get all active statuses (last 24h)
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const statuses = await (prisma as any).userStatus.findMany({
            where: {
                createdAt: { gte: twentyFourHoursAgo }
            },
            include: {
                user: {
                    select: {
                        nickname: true,
                        id: true
                    }
                },
                likes: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        const formattedStatuses = statuses.map((s: any) => ({
            id: s.id,
            content: s.content,
            createdAt: s.createdAt,
            userId: s.userId,
            nickname: s.user.nickname,
            likeCount: s.likes.length,
            hasLiked: userId ? s.likes.some((l: any) => l.userId === userId) : false
        }));

        return NextResponse.json(formattedStatuses);
    } catch (error) {
        console.error("GET Status Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}

// POST /api/status - Upsert current user status
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const { content } = await req.json();
        const userId = session.user.id;

        if (!content || typeof content !== "string") {
            return NextResponse.json({ message: "Contenu invalide" }, { status: 400 });
        }

        // Strict limit: 50 characters
        const trimmedContent = content.trim().substring(0, 50);

        if (trimmedContent.length === 0) {
            return NextResponse.json({ message: "Contenu vide" }, { status: 400 });
        }

        const status = await (prisma as any).userStatus.upsert({
            where: { userId },
            update: {
                content: trimmedContent,
                createdAt: new Date() // Reset TTL on update
            },
            create: {
                userId,
                content: trimmedContent
            }
        });

        return NextResponse.json(status);
    } catch (error) {
        console.error("POST Status Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
