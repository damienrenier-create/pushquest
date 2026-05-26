// src/app/api/gamebook/v3t/talk/route.ts
//
// v3.26 — POST : interaction avec V3T (vétérinaire de Macaron'île).
// Retourne le dialogue dynamique COMMENTATEUR selon l'état du tamagotchi.
// Le véto ne révèle plus les étapes (cf. biblio) — il commente la progression.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { parseTamagotchi, countDefisDone, CANONICAL_DEFIS, v3tDialogueLines } from "@/lib/gamebook/tamagotchi"

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

    const tam = parseTamagotchi((progress as { tamagotchi?: unknown }).tamagotchi)
    if (!tam) {
        const lines = v3tDialogueLines(false, 0, CANONICAL_DEFIS.length, false)
        return NextResponse.json({ ok: true, hasTamagotchi: false, lines })
    }

    const done = countDefisDone(tam)
    const total = CANONICAL_DEFIS.length
    const recovered = tam.recovered === true
    const lines = v3tDialogueLines(true, done, total, recovered)

    return NextResponse.json({
        ok: true,
        hasTamagotchi: true,
        done,
        total,
        recovered,
        lines,
    })
}
