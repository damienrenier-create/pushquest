// src/app/api/admin/tester/reset-full/route.ts
//
// Panneau testeur — wipe complet GamebookProgress + Daemons du tester.
// Au prochain GET /state, tout sera recréé from scratch.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireTester } from "@/lib/admin/requireTester"

export const dynamic = "force-dynamic"

export async function POST() {
    const auth = await requireTester()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const userId = auth.userId

    const gbpDeleted = await (prisma as any).gamebookProgress.deleteMany({ where: { userId } })
    const daemonsDeleted = await (prisma as any).daemon.deleteMany({ where: { userId } })

    return NextResponse.json({
        ok: true,
        action: "reset-full",
        gbpDeleted: gbpDeleted.count,
        daemonsDeleted: daemonsDeleted.count,
        note: "Le prochain GET /state recréera un GamebookProgress vierge.",
    })
}
