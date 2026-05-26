// src/app/api/gamebook/guigui/recharge/route.ts
//
// v3.32 — POST : recharge l'énergie du compte tester GUIGUI.
// Refus si user.isTester !== true.
//
// Effet : remet bonusSurplus à 1000 (la banque renouvelable).
// L'énergie disponible repassera à 1000 (cap 2000).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    const user = await (prisma as any).user.findUnique({
        where: { id: userId },
        select: { isTester: true },
    })
    if (user?.isTester !== true) {
        return NextResponse.json({ ok: false, reason: "Compte non éligible." }, { status: 403 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "Pas de progression." }, { status: 400 })
    }

    // Reset bonusSurplus à 1000 (la banque énergie renouvelable).
    // Cap 2000 sera appliqué à l'affichage côté state route.
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { bonusSurplus: 1000 },
    })

    return NextResponse.json({
        ok: true,
        recharged: true,
        bonusSurplus: 1000,
        message: "⚡ +1000 énergies. Banque rechargée.",
    })
}
