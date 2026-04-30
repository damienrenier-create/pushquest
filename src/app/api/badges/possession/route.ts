import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTodayISO, getRequiredRepsForDate, getDailyTargetForUserOnDate } from "@/lib/challenge";
import { getTorchWinnerForDate } from "@/lib/torch";
import { BADGE_DEFINITIONS } from "@/config/badges";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const today = getTodayISO();
        
        let req = getRequiredRepsForDate(today);

        if (session?.user?.id) {
            const user = await (prisma.user as any).findUnique({
                where: { id: session.user.id },
                select: { onboardingMode: true, onboardingStartISO: true }
            });
            req = getDailyTargetForUserOnDate(user, today).target;
        }

        // 1. Find Current Torchbearer (First to finish today - PERSISTENT)
        const winner = await getTorchWinnerForDate(today);
        let currentTorchbearer = winner ? {
            nickname: winner.nickname,
            time: winner.achievedAt,
            image: winner.image
        } : null;

        // 2. Find Torch Legacy Record Holder
        const torchLegacyOwnership = await (prisma as any).badgeOwnership.findUnique({
            where: { badgeKey: "torch_legacy" },
            include: { currentUser: { select: { nickname: true, image: true } } }
        });

        const torchDef = BADGE_DEFINITIONS.find(d => d.key === "torch_legacy");
        
        // Fallback: If no legacy record exists but we have a torchbearer today, they are the de-facto guardian
        const legacyHolder = torchLegacyOwnership?.currentUser?.nickname || (currentTorchbearer ? currentTorchbearer.nickname : "Inconnu");
        const legacyImage = torchLegacyOwnership?.currentUser?.image || (currentTorchbearer ? currentTorchbearer.image : null);
        const legacyRecord = torchLegacyOwnership ? torchLegacyOwnership.currentValue : (currentTorchbearer ? 1 : 0);

        return NextResponse.json({
            today: {
                holder: currentTorchbearer?.nickname || "Personne pour le moment",
                time: currentTorchbearer?.time || null,
                image: (currentTorchbearer as any)?.image || null,
                req
            },
            legacy: {
                holder: legacyHolder,
                image: legacyImage,
                record: legacyRecord,
                badge: torchDef
            }
        });
    } catch (error) {
        console.error("Possession API Error:", error);
        return NextResponse.json({ error: "Failed to fetch possession data" }, { status: 500 });
    }
}
