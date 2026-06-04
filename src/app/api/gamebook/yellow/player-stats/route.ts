// src/app/api/gamebook/yellow/player-stats/route.ts
//
// Nexus Jaune Éclair — expose les stats d'effort du jour (normalisées) qui
// modulent les rencontres sauvages. Gated feature flag (comme /save).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"
import { getWildPlayerCtx, neutralWildCtx, getYesterdayReps } from "@/lib/gamebook/yellow/server/playerStats"
import { getTodayISO } from "@/lib/challenge"

export const dynamic = "force-dynamic"

export async function GET() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!(await isNexusYellowEnabled(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 404 })

    const today = getTodayISO()
    try {
        const [ctx, yesterdayReps] = await Promise.all([getWildPlayerCtx(userId), getYesterdayReps(userId)])
        return NextResponse.json({ ok: true, ctx, yesterdayReps, today })
    } catch {
        return NextResponse.json({ ok: true, ctx: neutralWildCtx(), yesterdayReps: 0, today })
    }
}
