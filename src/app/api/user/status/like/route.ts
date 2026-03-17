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

        const { statusId } = await req.json()
        const currentUserId = (session.user as any).id

        const existingLike = await prisma.statusLike.findUnique({
            where: {
                statusId_userId: {
                    statusId,
                    userId: currentUserId
                }
            }
        })

        if (existingLike) {
            await prisma.statusLike.delete({
                where: { id: existingLike.id }
            })
            return NextResponse.json({ liked: false })
        } else {
            await prisma.statusLike.create({
                data: {
                    statusId,
                    userId: currentUserId
                }
            })
            return NextResponse.json({ liked: true })
        }
    } catch (error) {
        console.error("Status Like API Error:", error)
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 })
    }
}
