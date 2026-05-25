// src/app/api/gamebook/water/attempt/route.ts
//
// v3.23g — POST : le joueur a tenté d'entrer dans l'eau (waterShallow) avec swim_set
// mais sans firstSwimDone. Incrémente le compteur server-side et renvoie le message
// narratif correspondant. La mécanique du push coopératif est révélée progressivement.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

// 5 messages narratifs progressifs. Au-delà, on reste sur le message 5 (révélation faite).
const ATTEMPT_MESSAGES = [
    "Brrrr… jamais je n'oserai sauter là-dedans, elle est bien trop froide. Je risque sûrement le choc thermique !",
    "Peut-être que si je me mouillait la nuque ?",
    "Non, décidément je n'ose vraiment pas.",
    "Faudrait surtout pas que quelqu'un me pousse dedans… Je vais remouiller ma nuque pour être sûr.",
    "Bon en vrai, si un copain venait me pousser je n'aurais pas le choix…",
] as const

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

    const current = (progress as { waterShallowAttempts?: number }).waterShallowAttempts ?? 0
    const next = current + 1

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { waterShallowAttempts: next },
    })

    // Index dans le tableau (0..4) — au-delà de 5 attempts, on reste sur le 5e message
    const idx = Math.min(next, ATTEMPT_MESSAGES.length) - 1

    return NextResponse.json({
        ok: true,
        attempts: next,
        message: ATTEMPT_MESSAGES[idx],
    })
}
