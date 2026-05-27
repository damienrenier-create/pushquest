// src/app/api/gamebook/pastagone/capture/route.ts
//
// v4.0 Phase 4.B — POST : déclenche l'arrestation policière à la sortie ouest
// de Lasagnas Vegas (tile roadBlocked).
//
// Pré-conditions :
//   - tbBossBeaten === true (l'arc Pastagone n'a de sens qu'après Vegas)
//   - pastagoneArrested === false (idempotent)
//
// Effets :
//   - pastagoneArrested = true
//   - pastagoneInterrogStart = now (ancre des défis réels pompes/gainage/squats)
//   - pastagoneInterrogDefis = {} (reset)
//   - mapId/posX/posY → cellule Pastagone (8, 2, 4) face right
//
// Retour :
//   - 200 { ok: true, spawn: {...}, message }
//   - 403 si pré-conditions non remplies

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
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }
    if (progress.tbBossBeaten !== true) {
        return NextResponse.json({ ok: false, reason: "La Team Boulette n'est pas encore tombée." }, { status: 403 })
    }
    if (progress.pastagoneArrested === true) {
        // Idempotent : déjà arrêté
        return NextResponse.json({
            ok: true,
            alreadyArrested: true,
            spawn: { mapId: "pastagone_cellule", posX: 2, posY: 4, direction: "right" },
            message: "Tu es déjà en cellule.",
        })
    }

    const now = new Date()
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            pastagoneArrested: true,
            pastagoneInterrogStart: now,
            pastagoneInterrogDefis: {},
            mapId: "pastagone_cellule",
            posX: 2,
            posY: 4,
            direction: "right",
            lastSeen: now,
        },
    })

    return NextResponse.json({
        ok: true,
        alreadyArrested: false,
        spawn: { mapId: "pastagone_cellule", posX: 2, posY: 4, direction: "right" },
        message: "Tu te réveilles dans une cellule sombre du Pastagone. Une lampe te brûle les yeux.",
    })
}
