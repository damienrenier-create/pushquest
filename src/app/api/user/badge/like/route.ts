import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 })
        }

        const { badgeKey } = await req.json()
        const currentUserId = (session.user as any).id

        const existingLike = await prisma.badgeLike.findUnique({
            where: {
                badgeKey_userId: {
                    badgeKey,
                    userId: currentUserId
                }
            }
        })

        if (existingLike) {
            await prisma.badgeLike.delete({
                where: { id: existingLike.id }
            })
            return NextResponse.json({ liked: false })
        } else {
            await prisma.badgeLike.create({
                data: {
                    badgeKey,
                    userId: currentUserId
                }
            })
            return NextResponse.json({ liked: true })
        }
    } catch (error) {
        console.error("Badge Like API Error:", error)
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 })
    }
}
