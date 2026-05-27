// src/app/api/gamebook/pastagone/tour-rotate/route.ts
//
// v4.0 Phase 6 — POST : rotation aléatoire du PNJ visible dans la Tour de Garde.
//
// Logique :
//   - Si pastagoneTourLastRotAt est null OU > 10 minutes, on tire un nouveau PNJ.
//   - Sinon, on renvoie le PNJ courant (pastagoneTourLastNpc).
//
// Le PNJ est tiré au hasard dans TOUR_NPC_POOL (25 entrées).
// La rotation peut être forcée via { force: true } dans le body (après combat).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { findTourNpcById, pickTourNpcRandom } from "@/lib/gamebook/pastagoneTourNpcs"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const ROTATION_INTERVAL_MS = 10 * 60 * 1000  // 10 min

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { force?: boolean } = {}
    try { body = await req.json() } catch { /* OK no body */ }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    if (progress.pastagoneEscaped !== true) {
        return NextResponse.json({ ok: false, reason: "Pas encore évadé de cellule." }, { status: 403 })
    }

    const now = Date.now()
    const lastRotAt = progress.pastagoneTourLastRotAt
        ? new Date(progress.pastagoneTourLastRotAt).getTime()
        : 0
    const elapsed = now - lastRotAt
    const shouldRotate = body.force === true || !progress.pastagoneTourLastNpc || elapsed >= ROTATION_INTERVAL_MS

    let npcId = progress.pastagoneTourLastNpc as string | null
    let npc = npcId ? findTourNpcById(npcId) : null

    if (shouldRotate || !npc) {
        npc = pickTourNpcRandom()
        npcId = npc.id
        await (prisma as any).gamebookProgress.update({
            where: { id: progress.id },
            data: {
                pastagoneTourLastNpc: npcId,
                pastagoneTourLastRotAt: new Date(now),
            },
        })
    }

    const cooldownUntil = progress.pastagoneTourCooldownUntil
        ? new Date(progress.pastagoneTourCooldownUntil).toISOString()
        : null
    const cooldownActive = cooldownUntil ? new Date(cooldownUntil).getTime() > now : false

    return NextResponse.json({
        ok: true,
        npc,
        rotated: shouldRotate,
        cooldownUntil,
        cooldownActive,
    })
}
