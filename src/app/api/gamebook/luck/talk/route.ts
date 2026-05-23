// src/app/api/gamebook/luck/talk/route.ts
//
// v3.17 — POST : incrémente le compteur "luck" du joueur (max 1×/jour).
// Déclenché côté client à la fin du dialogue avec LINGUINI à Pépiteville.
//
// Idempotent : si lastLuckTalkDate === aujourd'hui, on no-op (granted: false).
// Sinon : luck += 1, lastLuckTalkDate = aujourd'hui (granted: true).
//
// Pas de coût en reps. Pas de check anti-cheat (talk = action gratuite).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"

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

    const today = getTodayISO()
    const lastDate = (progress as { lastLuckTalkDate?: string }).lastLuckTalkDate ?? ""
    const currentLuck = (progress as { luck?: number }).luck ?? 0

    // Déjà parlé aujourd'hui → no-op
    if (lastDate === today) {
        return NextResponse.json({
            ok: true,
            granted: false,
            luck: currentLuck,
            reason: "LINGUINI a besoin de recharger ses vibes. Reviens demain.",
        })
    }

    const newLuck = currentLuck + 1
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            luck: newLuck,
            lastLuckTalkDate: today,
            lastSeen: new Date(),
        },
    })

    return NextResponse.json({
        ok: true,
        granted: true,
        luck: newLuck,
    })
}
