// src/app/api/admin/tester/energy/route.ts
//
// Panneau testeur — ajuste l'énergie du compte tester.
// Body :
//   { delta: number }                  → bonusSurplus += delta (positif ou négatif)
//   { reset: true }                    → bonusSurplus = 0, energySpentToday = 0
//
// Toutes les modifications passent par GamebookProgress du chapter_id "map_v3".

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireTester } from "@/lib/admin/requireTester"
import { getTodayISO } from "@/lib/challenge"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

export async function POST(req: NextRequest) {
    const auth = await requireTester()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const userId = auth.userId

    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { /* empty */ }

    const today = getTodayISO()
    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }

    if (body.reset === true) {
        await (prisma as any).gamebookProgress.update({
            where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
            data: {
                bonusSurplus: 0,
                energySpentToday: 0,
                energySpentDate: today,
            },
        })
        return NextResponse.json({ ok: true, action: "reset", bonusSurplus: 0, energySpentToday: 0 })
    }

    const delta = typeof body.delta === "number" ? Math.floor(body.delta) : 0
    if (delta === 0) {
        return NextResponse.json({ ok: false, reason: "delta required (or reset:true)" }, { status: 400 })
    }

    const currentBonus = Math.max(0, progress.bonusSurplus ?? 0)
    const newBonus = Math.max(0, currentBonus + delta)
    await (prisma as any).gamebookProgress.update({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
        data: { bonusSurplus: newBonus },
    })
    return NextResponse.json({
        ok: true,
        action: "delta",
        delta,
        bonusSurplus: newBonus,
    })
}
