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

        const { content } = await req.json()
        const userEmail = session.user.email as string

        const user = await prisma.user.findUnique({
            where: { email: userEmail }
        })

        if (!user) {
            return NextResponse.json({ message: "Utilisateur non trouvé" }, { status: 404 })
        }

        // Check if content changed to clear likes
        const existingStatus = await prisma.userStatus.findUnique({
            where: { userId: user.id }
        })

        if (existingStatus && existingStatus.content !== content) {
            // Delete all likes if content changed
            await prisma.statusLike.deleteMany({
                where: { statusId: existingStatus.id }
            })
        }

        const updatedStatus = await prisma.userStatus.upsert({
            where: { userId: user.id },
            update: { 
                content: content.substring(0, 300),
                createdAt: new Date()
            },
            create: {
                userId: user.id,
                content: content.substring(0, 300)
            }
        })

        return NextResponse.json(updatedStatus)
    } catch (error) {
        console.error("User Status API Error:", error)
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 })
    }
}
