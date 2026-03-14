import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { BADGE_DEFINITIONS } from "@/config/badges";

export async function GET() {
    try {
        const featuredConfig = await (prisma as any).globalConfig.findUnique({
            where: { key: "featuredBadgeKey" }
        });

        if (!featuredConfig) {
            return NextResponse.json({ featured: null });
        }

        const badgeDef = BADGE_DEFINITIONS.find(b => b.key === featuredConfig.value);
        
        return NextResponse.json({
            featured: badgeDef ? {
                ...badgeDef,
                updatedAt: featuredConfig.updatedAt
            } : null
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch featured badge" }, { status: 500 });
    }
}
