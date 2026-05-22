// src/app/api/gamebook/grant-bag/route.ts
//
// v3.8 — POST : PEPITO donne le sac au joueur (1ère fois uniquement).
// Idempotent : si hasBag === true, retourne { ok: true, alreadyHasBag: true } sans rien faire.
// Refusé si frozen (v3.6).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isGamebookFrozen } from "@/lib/gamebook/antiCheat"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }

    if (isGamebookFrozen(progress as { gamebookFrozenUntil?: Date | null })) {
        return NextResponse.json({
            ok: false,
            reason: "Gamebook gelé.",
            frozen: true,
            frozenUntil: (progress as { gamebookFrozenUntil?: Date | null }).gamebookFrozenUntil,
        })
    }

    if (progress.hasBag === true) {
        return NextResponse.json({ ok: true, alreadyHasBag: true, hasBag: true })
    }

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { hasBag: true, lastSeen: new Date() },
    })

    return NextResponse.json({ ok: true, hasBag: true, alreadyHasBag: false })
}
