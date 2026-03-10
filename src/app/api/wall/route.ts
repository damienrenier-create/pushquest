import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const messages = await (prisma as any).wallMessage.findMany({
            orderBy: {
                createdAt: 'desc',
            },
            take: 100, // On limite aux 100 derniers messages pour la perf
            include: {
                user: {
                    select: {
                        nickname: true
                    }
                }
            }
        });

        const formattedMessages = messages.map((m: any) => ({
            id: m.id,
            nickname: m.user.nickname,
            message: m.content,
            createdAt: m.createdAt.toISOString()
        }));

        return NextResponse.json({ messages: formattedMessages });
    } catch (error: any) {
        console.error("Wall GET error:", error);
        return NextResponse.json({ error: "Impossible de charger la Place publique" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { message } = body;

        if (!message || typeof message !== "string" || message.trim().length === 0) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        if (message.length > 240) {
            return NextResponse.json({ error: "Message exceeds 240 characters" }, { status: 400 });
        }

        const newMessage = await (prisma as any).wallMessage.create({
            data: {
                content: message.trim(),
                userId: session.user.id
            },
            include: {
                user: {
                    select: {
                        nickname: true
                    }
                }
            }
        });

        // Enregistrer l'événement du premier message si c'est pertinent un jour (ex: badge)
        return NextResponse.json({
            success: true,
            message: {
                id: newMessage.id,
                nickname: newMessage.user.nickname,
                message: newMessage.content,
                createdAt: newMessage.createdAt.toISOString()
            }
        });
    } catch (error: any) {
        console.error("Wall POST error:", error);
        return NextResponse.json({ error: "Impossible de publier sur la Place publique" }, { status: 500 });
    }
}
