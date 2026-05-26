// src/app/api/gamebook/casino/croupier-talk/route.ts
//
// v3.24b-6 — POST : un croupier arme un boost (ou malus) pour le prochain pari.
// Body : { croupierId: "croupier_vitellino" | ... }
//
// 1× par jour : si déjà parlé à un croupier aujourd'hui, retourne un message
// "tu as déjà fait ta visite". Le boost est consommé au prochain pari Vegas.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { CROUPIER_BOOSTS } from "@/lib/gamebook/casinoBoost"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { croupierId?: string }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const croupierId = body.croupierId
    if (!croupierId || !(croupierId in CROUPIER_BOOSTS)) {
        return NextResponse.json({ ok: false, reason: "Croupier inconnu." }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    const today = getTodayISO()
    const lastDate = (progress as { casinoBoostDate?: string }).casinoBoostDate ?? ""
    const lastCroupier = (progress as { casinoCroupierTalkedToday?: string }).casinoCroupierTalkedToday ?? ""

    if (lastDate === today && lastCroupier && lastCroupier !== croupierId) {
        return NextResponse.json({
            ok: false,
            reason: `Tu as déjà parlé à ${lastCroupier.replace("croupier_", "").toUpperCase()} aujourd'hui.`,
        })
    }

    const boost = CROUPIER_BOOSTS[croupierId]
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            casinoBoostPctToday: boost,
            casinoBoostDate: today,
            casinoCroupierTalkedToday: croupierId,
        },
    })

    const sign = boost > 0 ? "+" : ""
    const tone = boost > 0
        ? "Ton prochain pari Vegas sera boosté."
        : "Ton prochain pari Vegas est maudit..."
    return NextResponse.json({
        ok: true,
        boostPct: boost,
        message: `🎩 Boost armé : ${sign}${boost}%. ${tone}`,
    })
}
