// src/app/api/gamebook/yellow/clan-fervor/route.ts
//
// FERVEUR DE CLAN (Chapelle de Nouillon) — dons DIRIGÉS entre alliés du même clan (run en cours).
//  POST { event:"badge", badgeId } → un allié a gagné un badge (avec le Daemon-clan en équipe, gaté client) :
//        +1 Super Pasta DANS LE SAC de chaque allié. Idempotent par (fromUserId, badgeId).
//  POST { event:"highfive", toUserId, message } → « high five » à UN allié : message ≤50 car + reps = nb de
//        caractères (≤50, cappé serveur). Gate : cible = allié du même clan, 1 high-five/allié/jour.
//  GET  → réclame les dons en attente au login : { pastas, energy, highfives:[{fromNickname,message,energy}] }.
//
// Table gated (try/catch) → NEUTRE tant que `db:push` n'a pas créé ClanGift.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"
import { sameClanUserIds } from "@/lib/gamebook/yellow/clanFervor"

export const dynamic = "force-dynamic"
const HIGHFIVE_MAX_CHARS = 50
const HIGHFIVE_MAX_REPS = 50

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { event?: unknown; badgeId?: unknown; toUserId?: unknown; message?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }

    try {
        const cg = (prisma as any).clanGift
        const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true } })
        if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 401 })
        const { myClan, userIds: clanMates } = await sameClanUserIds(prisma, auth.userId)
        if (!myClan) return NextResponse.json({ ok: true, skipped: "no-clan" }) // pas de clan ce run → aucun don

        // (b) BADGE gagné (avec le Daemon-clan en équipe, gaté côté client) → 1 Super Pasta pour chaque allié.
        if (body.event === "badge") {
            const badgeId = typeof body.badgeId === "string" ? body.badgeId.slice(0, 24) : ""
            if (clanMates.length === 0) return NextResponse.json({ ok: true, granted: 0 })
            // Idempotence : une seule fournée de pasta par (moi, badge) — anti re-POST / refresh.
            const dup = await cg.findFirst({ where: { fromUserId: auth.userId, kind: "pasta", message: badgeId || null }, select: { id: true } })
            if (dup) return NextResponse.json({ ok: true, skipped: "dup" })
            await cg.createMany({
                data: clanMates.map((toUserId) => ({ toUserId, fromUserId: auth.userId, fromNickname: me.nickname, kind: "pasta", energy: 0, message: badgeId || null })),
            })
            return NextResponse.json({ ok: true, granted: clanMates.length })
        }

        // (c) HIGH FIVE à un allié : message + reps (1/caractère, cappé). Gate : cible alliée + 1/jour/allié.
        if (body.event === "highfive") {
            const toUserId = typeof body.toUserId === "string" ? body.toUserId : ""
            if (!toUserId || !clanMates.includes(toUserId)) return NextResponse.json({ error: "not_ally" }, { status: 400 })
            const message = (typeof body.message === "string" ? body.message : "").slice(0, HIGHFIVE_MAX_CHARS)
            const reps = Math.min(HIGHFIVE_MAX_REPS, message.length) // 1 rep par caractère, plafonné
            // 1 high-five par jour et par allié (fenêtre 24 h) → anti-spam.
            const since = new Date(Date.now() - 24 * 3600 * 1000)
            const recent = await cg.findFirst({ where: { fromUserId: auth.userId, toUserId, kind: "highfive", createdAt: { gte: since } }, select: { id: true } })
            if (recent) return NextResponse.json({ error: "cooldown" }, { status: 429 })
            await cg.create({ data: { toUserId, fromUserId: auth.userId, fromNickname: me.nickname, kind: "highfive", energy: reps, message } })
            return NextResponse.json({ ok: true, reps })
        }

        return NextResponse.json({ error: "bad_event" }, { status: 400 })
    } catch {
        return NextResponse.json({ ok: true, skipped: "no-table" }) // table pas encore créée → neutre
    }
}

// Réclamation au login : crédite les dons de ferveur en attente.
export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const cg = (prisma as any).clanGift
        const pending = (await cg.findMany({
            where: { toUserId: auth.userId, claimed: false },
            select: { id: true, kind: true, energy: true, message: true, fromNickname: true },
            take: 200,
        })) as { id: string; kind: string; energy: number; message: string | null; fromNickname: string }[]
        if (pending.length === 0) return NextResponse.json({ ok: true, pastas: 0, energy: 0, highfives: [] })
        await cg.updateMany({ where: { id: { in: pending.map((g) => g.id) } }, data: { claimed: true } })
        const pastas = pending.filter((g) => g.kind === "pasta").length
        const highfives = pending.filter((g) => g.kind === "highfive").map((g) => ({ fromNickname: g.fromNickname, message: g.message ?? "", energy: g.energy ?? 0 }))
        const energy = pending.reduce((a, g) => a + (g.energy ?? 0), 0)
        return NextResponse.json({ ok: true, pastas, energy, highfives })
    } catch {
        return NextResponse.json({ ok: true, pastas: 0, energy: 0, highfives: [] })
    }
}
