// src/app/api/gamebook/tree/discover/route.ts
//
// v3.25 — POST : enregistre la découverte d'un arbre dans le Pokédex.
// Body : { kind: TreeKind }
//
// Idempotent : si le kind est déjà dans treesDiscovered, no-op.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const VALID_KINDS = ["apple", "cherry", "pear", "peach", "coconut", "poison", "olive", "boost", "divisor"]

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { kind?: string }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const kind = body.kind
    if (!kind || !VALID_KINDS.includes(kind)) {
        return NextResponse.json({ ok: false, reason: "kind invalide" }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    const discoveredRaw = (progress as { treesDiscovered?: unknown }).treesDiscovered
    const discovered: string[] = Array.isArray(discoveredRaw)
        ? (discoveredRaw as unknown[]).filter((x): x is string => typeof x === "string")
        : []

    if (discovered.includes(kind)) {
        return NextResponse.json({ ok: true, alreadyDiscovered: true, discovered })
    }

    const newDiscovered = [...discovered, kind]
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { treesDiscovered: newDiscovered },
    })

    return NextResponse.json({ ok: true, newDiscovery: true, kind, discovered: newDiscovered })
}
