// src/app/api/admin/tester/logs/route.ts
//
// Panneau testeur — retourne les 100 derniers XpAdjustment + CoinAdjustment du tester.
// (Pas de table GamebookEvent : décision créateur Q-B.)

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireTester } from "@/lib/admin/requireTester"

export const dynamic = "force-dynamic"

export async function GET() {
    const auth = await requireTester()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const userId = auth.userId

    const xpAdj = await (prisma as any).xpAdjustment.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 50,
    })
    const coinAdj = await (prisma as any).coinAdjustment.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 50,
    })

    return NextResponse.json({
        ok: true,
        xpAdjustments: xpAdj,
        coinAdjustments: coinAdj,
    })
}
