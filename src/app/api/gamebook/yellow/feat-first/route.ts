// src/app/api/gamebook/yellow/feat-first/route.ts
//
// Nexus Jaune Éclair — 🥇 « 1er DU GROUPE » (course au premier). Grave le PREMIER joueur à accomplir un FAIT
// phare : featId @unique → premier arrivé, premier (et SEUL) servi. Le halo 🥇 s'affiche ensuite sur le profil
// (PlayerBadgesModal) du détenteur. Faits suivis : "champion", "fusion_champion", "catch_ukognofy".
//   GET  : { holders: { [featId]: { userId, nickname } } }
//   POST { featId } : revendique (idempotent) → { mine, holder }. Gère la course (contrainte unique).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"

export const dynamic = "force-dynamic"

export const FEAT_FIRST_IDS = ["champion", "fusion_champion", "catch_ukognofy"] as const
const FEATS = new Set<string>(FEAT_FIRST_IDS)

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
    try {
        const rows = (await (prisma as any).featFirst.findMany({ select: { featId: true, userId: true, nickname: true } })) as { featId: string; userId: string; nickname: string }[]
        const holders: Record<string, { userId: string; nickname: string }> = {}
        for (const r of rows) holders[r.featId] = { userId: r.userId, nickname: r.nickname }
        return NextResponse.json({ ok: true, holders })
    } catch {
        return NextResponse.json({ ok: true, holders: {} }) // table pas encore créée → neutre
    }
}

export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    let body: { featId?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const featId = typeof body.featId === "string" && FEATS.has(body.featId) ? body.featId : null
    if (!featId) return NextResponse.json({ error: "Bad feat" }, { status: 400 })

    try {
        const ff = (prisma as any).featFirst
        const existing = await ff.findUnique({ where: { featId }, select: { userId: true, nickname: true } })
        if (existing) return NextResponse.json({ ok: true, featId, mine: existing.userId === auth.userId, holder: existing })
        const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true } })
        if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 401 })
        try {
            await ff.create({ data: { featId, userId: auth.userId, nickname: me.nickname } })
            return NextResponse.json({ ok: true, featId, mine: true, holder: { userId: auth.userId, nickname: me.nickname } })
        } catch {
            // COURSE : un autre joueur a créé la ligne entre-temps (violation d'unicité) → on relit le vrai détenteur.
            const now = await ff.findUnique({ where: { featId }, select: { userId: true, nickname: true } })
            return NextResponse.json({ ok: true, featId, mine: now?.userId === auth.userId, holder: now ?? null })
        }
    } catch {
        return NextResponse.json({ ok: true, featId, mine: false, holder: null }) // table pas encore créée → neutre
    }
}
