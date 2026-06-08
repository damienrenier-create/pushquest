import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { hash } from "bcryptjs"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    console.log("[DB_URL_SCHEME]", (process.env.DATABASE_URL || "").split(":")[0]);
    console.log("[DIRECT_URL_SCHEME]", (process.env.DIRECT_URL || "").split(":")[0]);
    try {
        const { email, code, nickname, promoCode, invite } = await req.json()

        // Compte INVITÉ/AMI : créé via le lien /register?invite=<code>. Joue au
        // Chapitre 2 mais reste hors-concours (cf. isGuest). Code partagé par Sartay.
        const GUEST_INVITE_CODE = process.env.GUEST_INVITE_CODE || "nexus-ami-2026"
        const isGuest = typeof invite === "string" && invite === GUEST_INVITE_CODE

        if (!email || !code || !nickname) {
            return NextResponse.json(
                { message: "Tous les champs sont requis." },
                { status: 400 }
            )
        }

        if (code.length < 3) {
            return NextResponse.json(
                { message: "Le code doit faire au moins 3 caractères." },
                { status: 400 }
            )
        }

        // Check if user exists by email
        const existingEmail = await prisma.user.findUnique({
            where: { email },
        })

        if (existingEmail) {
            return NextResponse.json(
                { message: "Un utilisateur avec cet email existe déjà." },
                { status: 400 }
            )
        }

        // Check if user exists by nickname
        const existingNickname = await prisma.user.findFirst({
            where: { nickname },
        })

        if (existingNickname) {
            return NextResponse.json(
                { message: "Ce pseudo est déjà pris." },
                { status: 400 }
            )
        }

        const onboardingStartedAt = new Date();

        const user = await prisma.user.create({
            data: {
                email,
                password: code, // On stocke en clair car c'est un "code" volontairement faible par design
                nickname,
                onboardingStartedAt,
                isGuest,
            },
            select: {
                id: true,
                email: true,
                nickname: true,
            }
        })

        return NextResponse.json({ user, message: "Utilisateur créé avec succès" }, { status: 201 })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { message: "Une erreur est survenue lors de l'inscription." },
            { status: 500 }
        )
    }
}
