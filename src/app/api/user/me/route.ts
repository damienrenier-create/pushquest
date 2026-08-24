import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Infos minimales du JOUEUR COURANT NON exposées dans la session NextAuth.
// Sert surtout à connaître isGuest côté client (gating de l'onboarding : un invité
// ne subit pas le carousel de 1re connexion, cf. FeatureDiscoveryCarousel / GuestNexusHint).
// Lecture seule, additive, ne touche pas auth.ts. Défaut SÛR : isGuest=false.
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;
        if (!userId) return NextResponse.json({ isGuest: false, gameMode: "normal" });
        const user = await (prisma.user as any).findUnique({
            where: { id: userId },
            select: { isGuest: true, nickname: true, gameMode: true },
        });
        return NextResponse.json({
            isGuest: user?.isGuest === true,
            nickname: user?.nickname ?? null,
            // gameMode : "fun" = compte du lien nexus-fun-2026 (expérience allégée, PAS de profil/cash/lien d'invitation).
            gameMode: user?.gameMode ?? "normal",
        });
    } catch (e) {
        console.error("/api/user/me error:", e);
        return NextResponse.json({ isGuest: false, gameMode: "normal" });
    }
}
