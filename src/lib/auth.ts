import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import prisma from "./prisma"

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                identifier: { label: "Pseudo ou Email", type: "text" },
                code: { label: "Code", type: "password" },
                remember: { label: "Remember Me", type: "text" }
            },
            async authorize(credentials) {
                const identifier = credentials?.identifier
                const code = credentials?.code
                const remember = credentials?.remember === "true"

                if (!identifier || !code || code.length < 3) {
                    return null
                }

                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: identifier.toLowerCase() },
                            { nickname: identifier }
                        ]
                    }
                })

                if (!user) {
                    return null
                }

                // Par design : pas de vérification de hash, juste longueur >= 3
                return {
                    id: user.id,
                    email: user.email,
                    name: user.nickname,
                    remember: remember,
                    league: (user as any).league,
                    alterEgoId: (user as any).alterEgoId
                } as any
            }
        })
    ],
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 jours (cookie long)
    },
    callbacks: {
        jwt: async ({ token, user }) => {
            if (user) {
                const u = user as any
                token.id = u.id
                token.name = u.name
                token.remember = u.remember
                token.league = u.league
                token.alterEgoId = u.alterEgoId
                // Calculer l'expiration logique : 30j si remember, sinon 1j
                const duration = u.remember ? 30 * 24 * 60 * 60 : 1 * 24 * 60 * 60
                token.expiresAt = Math.floor(Date.now() / 1000) + duration

                // Admin check
                const moderatorEmails = (process.env.MODERATOR_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
                token.isAdmin = u.email ? moderatorEmails.includes(u.email.toLowerCase()) : false;
            }

            // Vérification de l'expiration logique
            if (token.expiresAt && Math.floor(Date.now() / 1000) > (token.expiresAt as number)) {
                token.expired = true
            }

            return token
        },
        session: async ({ session, token }) => {
            if (session?.user) {
                const user = session.user as any;
                user.id = token.id as string;
                user.name = token.name as string;
                user.expired = token.expired as boolean;
                user.isAdmin = token.isAdmin as boolean;
                user.league = token.league as string;
                user.alterEgoId = token.alterEgoId as string;
            }
            return session
        }
    },
    pages: {
        signIn: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET || "super-secret-pompes-app-key-for-dev",
}
