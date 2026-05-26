// src/app/api/gamebook/tb/brute/route.ts
//
// v3.24c-8 — POST : interaction avec une brute lâchée (5 PNJ wanderers
// dans lasagnas_vegas, IDs tb_sbire_lacher_1..5).
//
// Si le joueur est en mode "lying_pursued" (a menti au videur) ET que le boss
// n'est pas encore vaincu : -10 reps (= +10 energySpentToday). Une seule fois
// par brute, jusqu'à ce que le boss soit vaincu (= libération des brutes).
//
// Sinon : dialogue neutre, pas de malus.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const MALUS_REPS = 10

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { bruteId?: string }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const bruteId = body.bruteId
    if (!bruteId || typeof bruteId !== "string") {
        return NextResponse.json({ ok: false, reason: "bruteId requis." }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    const videurState = (progress as { videurState?: string }).videurState ?? "untouched"
    const bossBeaten = (progress as { tbBossBeaten?: boolean }).tbBossBeaten === true

    // Dialogue neutre si pas en mode lying_pursued ou boss vaincu
    if (videurState !== "lying_pursued" || bossBeaten) {
        return NextResponse.json({
            ok: true,
            malus: 0,
            message: bossBeaten
                ? "*La brute t'évite du regard, gênée.* « ... »"
                : "*La brute hausse les épaules.* « Tch. »",
        })
    }

    const talked: string[] = Array.isArray((progress as { tbBrutesTalked?: unknown }).tbBrutesTalked)
        ? ((progress as { tbBrutesTalked: unknown[] }).tbBrutesTalked as string[])
        : []
    if (talked.includes(bruteId)) {
        return NextResponse.json({
            ok: true,
            malus: 0,
            alreadyTaxed: true,
            message: "*La brute t'a déjà pris ta dîme. Elle te toise sans bouger.*",
        })
    }

    // Application du malus : +10 energySpentToday
    const today = getTodayISO()
    const storedDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
    const storedSpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
    const currentSpent = storedDate === today ? storedSpent : 0
    const newSpent = currentSpent + MALUS_REPS
    const newTalked = [...talked, bruteId]

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            energySpentToday: newSpent,
            energySpentDate: today,
            tbBrutesTalked: newTalked,
        },
    })

    return NextResponse.json({
        ok: true,
        malus: MALUS_REPS,
        message: `*La brute t'attrape par le col.* « Le boss a dit de te faire payer. -${MALUS_REPS} reps. »`,
    })
}
