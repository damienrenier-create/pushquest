// src/app/api/admin/tester/validate-defi/route.ts
//
// Panneau testeur — force la validation d'un défi d'adoption animal (V3T) par index.
//
// Body : { defiIndex: 0..6 }
//   0 VISIT, 1 DRINK, 2 PATES, 3 DAY_HALVES, 4 PLANK_180, 5 PUSHUP_200, 6 SQUAT_300
//
// Modifie `tamagotchi.defiProgress[defiIndex] = true` dans GamebookProgress.

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireTester } from "@/lib/admin/requireTester"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

export async function POST(req: NextRequest) {
    const auth = await requireTester()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const userId = auth.userId

    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { /* empty */ }

    const defiIndex = typeof body.defiIndex === "number" ? Math.floor(body.defiIndex) : null
    if (defiIndex === null || defiIndex < 0 || defiIndex > 6) {
        return NextResponse.json({ ok: false, reason: "defiIndex requis (0..6)" }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }

    const tam = (progress as { tamagotchi?: unknown }).tamagotchi
    if (!tam || typeof tam !== "object") {
        return NextResponse.json({
            ok: false,
            reason: "Pas d'animal adopté — va d'abord chez V3T pour en adopter un.",
        }, { status: 400 })
    }

    const tamObj = tam as { defiProgress?: Record<string, boolean> }
    const newProgress = { ...(tamObj.defiProgress ?? {}), [String(defiIndex)]: true }
    const newTam = { ...tamObj, defiProgress: newProgress }

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { tamagotchi: newTam },
    })

    const doneCount = Object.values(newProgress).filter((v) => v === true).length
    return NextResponse.json({
        ok: true,
        defiIndex,
        doneCount,
        total: 7,
        message: `Défi #${defiIndex} validé. ${doneCount}/7 défis OK.`,
    })
}
