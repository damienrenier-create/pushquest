// src/app/api/gamebook/pastagone/faa-gift/route.ts
//
// v4.0 — POST : Brigadier FAA donne son cadeau one-shot (+100 reps + indice).
//
// Conditions :
//   - pastagoneEscaped === true
//   - pastagoneFaaGiftClaimed !== true (one-shot)
//
// Effets :
//   - +100 reps (energySpentToday -= 100, clamp 0)
//   - pastagoneFaaGiftClaimed = true

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const GIFT_AMOUNT = 100

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
    if (progress.pastagoneEscaped !== true) {
        return NextResponse.json({ ok: false, reason: "Pas encore évadé." }, { status: 403 })
    }
    if (progress.pastagoneFaaGiftClaimed === true) {
        return NextResponse.json({ ok: false, reason: "Tu as déjà reçu ce cadeau." }, { status: 400 })
    }

    // Réduit energySpentToday de 100 (clamp 0) — effet inverse de spend
    const today = new Date().toISOString().slice(0, 10)
    const currentSpent = progress.energySpentDate === today ? (progress.energySpentToday ?? 0) : 0
    const newSpent = Math.max(0, currentSpent - GIFT_AMOUNT)

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            energySpentToday: newSpent,
            energySpentDate: today,
            pastagoneFaaGiftClaimed: true,
        },
    })

    return NextResponse.json({
        ok: true,
        bonus: GIFT_AMOUNT,
        message: `🛡️ BRIGADIER FAA glisse une enveloppe : +${GIFT_AMOUNT} reps. « Le boss frappe vite. Sa Stelmaria mord avant que tu ne réagisses. Réfléchis. »`,
    })
}
