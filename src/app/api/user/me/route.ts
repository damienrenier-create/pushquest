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
        if (!userId) return NextResponse.json({ isGuest: false });
        const user = await (prisma.user as any).findUnique({
            where: { id: userId },
            select: { isGuest: true, nickname: true },
        });
        return NextResponse.json({
            isGuest: user?.isGuest === true,
            nickname: user?.nickname ?? null,
        });
    } catch (e) {
        console.error("/api/user/me error:", e);
        return NextResponse.json({ isGuest: false });
    }
}
