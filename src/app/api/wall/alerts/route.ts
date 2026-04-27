import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getTodayISO } from "@/lib/challenge";
import { SPECIAL_WORKOUTS } from "@/config/specialWorkouts";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const today = getTodayISO();

        // 1. Current Featured Badge
        const featuredBadge = await (prisma as any).globalConfig.findUnique({
            where: { key: "featuredBadgeKey" }
        });

        // 2. Torch Guardian
        const torchLegacyOwnership = await (prisma as any).badgeOwnership.findUnique({
            where: { badgeKey: "torch_legacy" },
            include: { currentUser: { select: { nickname: true } } }
        });

        // 3. Active Event (Next Special Workout or Special Day)
        // For simplicity, we'll just check if there's a workout active today
        const activeWorkout = SPECIAL_WORKOUTS.find(w => w.endDate && today >= w.date && today <= w.endDate);

        return NextResponse.json({
            featuredBadge: featuredBadge?.value || null,
            guardian: torchLegacyOwnership?.currentUser?.nickname || null,
            activeEvent: activeWorkout?.slug || today // Fallback to today's date for special days
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
    }
}
