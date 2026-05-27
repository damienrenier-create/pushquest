// src/app/api/admin/tester/snapshot/route.ts
//
// Panneau testeur — sérialise / restore l'état complet du tester.
//
// GET             → retourne snapshot { progress, daemons } sérialisable JSON
// POST { snapshot } → restore les champs depuis ce snapshot

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireTester } from "@/lib/admin/requireTester"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

export async function GET() {
    const auth = await requireTester()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const userId = auth.userId

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    const daemons = await (prisma as any).daemon.findMany({ where: { userId } })

    return NextResponse.json({
        ok: true,
        snapshot: { progress, daemons, takenAt: new Date().toISOString() },
    })
}

export async function POST(req: NextRequest) {
    const auth = await requireTester()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const userId = auth.userId

    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { /* empty */ }

    const snapshot = body.snapshot as { progress?: Record<string, unknown>; daemons?: Record<string, unknown>[] } | undefined
    if (!snapshot || typeof snapshot !== "object") {
        return NextResponse.json({ ok: false, reason: "snapshot required" }, { status: 400 })
    }

    // Restore progress (champs non-system uniquement)
    if (snapshot.progress) {
        const p = { ...snapshot.progress }
        // Champs à exclure (id, userId, createdAt, updatedAt, chapterId)
        delete p.id
        delete p.userId
        delete p.createdAt
        delete p.updatedAt
        delete p.chapterId
        await (prisma as any).gamebookProgress.update({
            where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
            data: p,
        })
    }

    // Restore daemons : wipe + recréation
    if (Array.isArray(snapshot.daemons)) {
        await (prisma as any).daemon.deleteMany({ where: { userId } })
        for (const d of snapshot.daemons) {
            const data = { ...d }
            delete data.id
            data.userId = userId
            try {
                await (prisma as any).daemon.create({ data })
            } catch (e) {
                console.warn("[tester/snapshot] create daemon failed", e)
            }
        }
    }

    return NextResponse.json({ ok: true, action: "snapshot-restore" })
}
