// src/app/api/gamebook/grass-sud-cutscene/route.ts
//
// v3.28 — POST : marque la cinématique "ouverture du chemin vers Muscuville" comme jouée.
// Idempotent.

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

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    const already = (progress as { grassSudCutsceneShown?: boolean }).grassSudCutsceneShown === true
    if (already) return NextResponse.json({ ok: true, alreadyShown: true })

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { grassSudCutsceneShown: true },
    })
    return NextResponse.json({ ok: true, justShown: true })
}
