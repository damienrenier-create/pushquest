// src/app/api/gamebook/tamagotchi/in-bag/route.ts
//
// v3.27 — POST : toggle tamagotchiInBag.
// Body : { inBag: boolean }
//   - true  : range l'animal dans le sac (sprite caché de la map)
//   - false : sort l'animal du sac (sprite réapparait derrière le joueur)

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { inBag?: boolean }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    if (typeof body.inBag !== "boolean") {
        return NextResponse.json({ ok: false, reason: "inBag manquant." }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { tamagotchiInBag: body.inBag, tamagotchiInteractionsAt: [] },
    })

    return NextResponse.json({
        ok: true,
        inBag: body.inBag,
        message: body.inBag
            ? "Tu glisses doucement ton compagnon dans ton sac."
            : "Ton compagnon ressort joyeusement.",
    })
}
