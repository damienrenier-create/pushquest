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
                include: { user: { select: { nickname: true } } }
            });

            const userProgress: Record<string, number> = {};
            for (const s of daySets) {
                userProgress[s.userId] = (userProgress[s.userId] || 0) + s.reps;
                if (userProgress[s.userId] >= req) {
                    currentTorchbearer = {
                        nickname: s.user.nickname,
                        time: s.createdAt
                    };
                    break;
                }
            }
        }

        // 2. Find Torch Legacy Record Holder
        const torchLegacyOwnership = await (prisma as any).badgeOwnership.findUnique({
            where: { badgeKey: "torch_legacy" },
            include: { currentUser: { select: { nickname: true } } }
        });

        const torchDef = BADGE_DEFINITIONS.find(d => d.key === "torch_legacy");

        return NextResponse.json({
            today: {
                holder: currentTorchbearer?.nickname || "Personne pour le moment",
                time: currentTorchbearer?.time || null,
                req
            },
            legacy: {
                holder: torchLegacyOwnership?.currentUser?.nickname || "Inconnu",
                record: torchLegacyOwnership?.currentValue || 0,
                badge: torchDef
            }
        });
    } catch (error) {
        console.error("Possession API Error:", error);
        return NextResponse.json({ error: "Failed to fetch possession data" }, { status: 500 });
    }
}
