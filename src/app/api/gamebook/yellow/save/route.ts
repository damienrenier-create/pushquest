// src/app/api/gamebook/yellow/save/route.ts
//
// Nexus Jaune Éclair — sauvegarde/chargement de la progression (équipe, PC, objets,
// Pokédex). Stockée dans GamebookProgress.flags de la ligne chapterId="yellow"
// (isolée de l'arc v3 → pas de migration). Gated feature flag.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled, YELLOW_CHAPTER_ID, YELLOW_ENTRANCE_MAP_ID } from "@/lib/gamebook/yellow/featureFlag"
import { parseSave, emptySave } from "@/lib/gamebook/yellow/storage/save"

export const dynamic = "force-dynamic"

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    const row = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId: auth.userId, chapterId: YELLOW_CHAPTER_ID } },
    })
    const save = row?.flags ? parseSave(row.flags) : emptySave()
    return NextResponse.json({ ok: true, save })
}

export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { save?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const save = parseSave(body.save) // sanitize systématique côté serveur

    await (prisma as any).gamebookProgress.upsert({
        where: { userId_chapterId: { userId: auth.userId, chapterId: YELLOW_CHAPTER_ID } },
        create: {
            userId: auth.userId,
            chapterId: YELLOW_CHAPTER_ID,
            currentNodeId: "map",
            mapId: YELLOW_ENTRANCE_MAP_ID,
            posX: 10, posY: 12, direction: "down",
            flags: save as unknown as object,
        },
        update: { flags: save as unknown as object },
    })

    return NextResponse.json({ ok: true })
}
