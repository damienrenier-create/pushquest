// src/app/api/admin/tester/reset-battle/route.ts
//
// Panneau testeur — force la sortie de tout combat actif.
// Set Daemon.activeBattle = null pour tous les Daemons du tester.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireTester } from "@/lib/admin/requireTester"

export const dynamic = "force-dynamic"

export async function POST() {
    const auth = await requireTester()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const userId = auth.userId

    const updated = await (prisma as any).daemon.updateMany({
        where: { userId },
        data: { activeBattle: null as unknown as object },
    })
    return NextResponse.json({ ok: true, action: "reset-battle", daemonsAffected: updated.count })
}
