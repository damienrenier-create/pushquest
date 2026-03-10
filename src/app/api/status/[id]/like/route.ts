import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const { id: statusId } = await params;
        const userId = session.user.id;

        // Check if like exists
        const existingLike = await (prisma as any).statusLike.findUnique({
            where: {
                statusId_userId: {
                    statusId,
                    userId
                }
            }
        });

        if (existingLike) {
            // Unlike
            await (prisma as any).statusLike.delete({
                where: { id: existingLike.id }
            });
            return NextResponse.json({ liked: false });
        } else {
            // Like
            await (prisma as any).statusLike.create({
                data: {
                    statusId,
                    userId
                }
            });
            return NextResponse.json({ liked: true });
        }
    } catch (error) {
        console.error("Like Status Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
