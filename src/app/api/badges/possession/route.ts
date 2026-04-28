import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getTodayISO, getRequiredRepsForDate } from "@/lib/challenge";
import { BADGE_DEFINITIONS } from "@/config/badges";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const today = getTodayISO();
        const req = getRequiredRepsForDate(today);

        // 1. Find Current Torchbearer (First to finish today)
        let currentTorchbearer = null;
        if (req > 0) {
            const daySets = await (prisma as any).exerciseSet.findMany({
                where: { date: today },
                orderBy: { createdAt: "asc" },
                include: { user: { select: { nickname: true, image: true } } }
            });

            const userProgress: Record<string, number> = {};
            for (const s of daySets) {
                const effort = s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps;
                userProgress[s.userId] = (userProgress[s.userId] || 0) + effort;
                if (userProgress[s.userId] >= req) {
                    currentTorchbearer = {
                        nickname: s.user.nickname,
                        time: s.createdAt,
                        image: s.user.image
                    };
                    break;
                }
            }
        }

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
