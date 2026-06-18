// src/app/api/gamebook/yellow/duel-gift/route.ts
//
// Nexus Jaune Éclair — CADEAU CROISÉ de duel.
//  POST : le vainqueur signale avoir battu le REFLET de `toUserId` → crée une consolation
//         (énergie + rêve du Dieu Spaghetti) pour ce joueur, à réclamer plus tard.
//  GET  : le joueur réclame ses cadeaux en attente (marqués réclamés) → son client applique
//         l'énergie + affiche la notif « rêve ».
//
// NB : on utilise (prisma as any).duelGift comme la route advisor/ → le code COMPILE même avant
// `npm run db:push` (qui crée la table DuelGift ET régénère le client). Les try/catch rendent la
// feature NEUTRE tant que la table n'existe pas (aucun impact sur le combat).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"

export const dynamic = "force-dynamic"

const GIFT_ENERGY = 30

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

// Le joueur réclame ses cadeaux de consolation en attente (et les marque réclamés).
export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const dg = (prisma as any).duelGift // table gated (cf. advisor/), créée par db:push
        const rows = (await dg.findMany({
            where: { toUserId: auth.userId, claimed: false },
            orderBy: { createdAt: "asc" },
            take: 50,
            select: { id: true, fromNickname: true, energy: true },
        })) as { id: string; fromNickname: string; energy: number }[]
        if (rows.length > 0) {
            await dg.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { claimed: true } })
        }
        return NextResponse.json({ ok: true, gifts: rows })
    } catch {
        return NextResponse.json({ ok: true, gifts: [] }) // table pas encore créée → neutre
    }
}

// Le vainqueur signale avoir battu le reflet de `toUserId`.
export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { toUserId?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const toUserId = typeof body.toUserId === "string" ? body.toUserId : ""
    if (!toUserId || toUserId === auth.userId) return NextResponse.json({ error: "Bad target" }, { status: 400 })

    try {
        const dg = (prisma as any).duelGift // table gated (cf. advisor/), créée par db:push
        // Pseudo du vainqueur TRUSTÉ serveur (pas le client) → pas d'usurpation dans le rêve.
        const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true } })
        if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 401 })
        const target = await prisma.user.findUnique({ where: { id: toUserId }, select: { id: true } })
        if (!target) return NextResponse.json({ ok: true, skipped: "no-target" })
        // Anti-stacking : un seul cadeau non réclamé de MOI vers cette cible à la fois.
        const existing = await dg.findFirst({ where: { toUserId, fromUserId: auth.userId, claimed: false }, select: { id: true } })
        if (existing) return NextResponse.json({ ok: true, skipped: "exists" })
        await dg.create({ data: { toUserId, fromUserId: auth.userId, fromNickname: me.nickname, energy: GIFT_ENERGY } })
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ ok: true, skipped: "no-table" }) // table pas encore créée → neutre
    }
}
