// src/app/api/gamebook/casino/lotto-poule/route.ts
//
// v3.24b-1 — POST : Lotto Poule (grille 4×4, 1/16, max 1 win par jour).
// Body : { caseIndex: number 0..15 }
//
// Mise : 10 reps. Gain : ×16 (= +150 net si win).
// Tirage : random 0..15. Si caseIndex === draw → win.
// Limite : si le joueur a déjà gagné aujourd'hui, refus.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const STAKE = 10
const PAYOUT_MULT = 16

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { caseIndex?: number }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const caseIndex = typeof body.caseIndex === "number" ? Math.floor(body.caseIndex) : -1
    if (caseIndex < 0 || caseIndex > 15) {
        return NextResponse.json({ ok: false, reason: "Case invalide." }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    const today = getTodayISO()
    const lastDate = (progress as { lottoPouleDate?: string }).lottoPouleDate ?? ""
    const wonToday = lastDate === today && (progress as { lottoPouleWonToday?: boolean }).lottoPouleWonToday === true
    if (wonToday) {
        return NextResponse.json({ ok: false, reason: "Tu as déjà gagné aujourd'hui. Reviens demain." })
    }

    // Vérifier qu'on a au moins 10 reps disponibles
    const storedDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
    const storedSpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
    const currentSpent = storedDate === today ? storedSpent : 0

    const sets = await prisma.exerciseSet.findMany({ where: { userId, date: today } })
    const todayReps = sets.reduce((sum, s) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps), 0)
    const bonusSurplus = (progress as { bonusSurplus?: number }).bonusSurplus ?? 0
    const available = todayReps - currentSpent + bonusSurplus
    if (available < STAKE) {
        return NextResponse.json({ ok: false, reason: `Pas assez de reps. Tu as ${available}, il en faut ${STAKE}.` })
    }

    // Tirage
    const draw = Math.floor(Math.random() * 16)
    const won = draw === caseIndex
    const netDelta = won ? -(PAYOUT_MULT * STAKE - STAKE) : STAKE
    const newSpent = currentSpent + netDelta

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            energySpentToday: newSpent,
            energySpentDate: today,
            lottoPouleDate: today,
            ...(won ? { lottoPouleWonToday: true } : {}),
        },
    })

    return NextResponse.json({
        ok: true,
        won,
        draw,
        caseIndex,
        stake: STAKE,
        netReps: won ? PAYOUT_MULT * STAKE - STAKE : -STAKE,
        message: won
            ? `🐔 LOTTO POULE GAGNANT ! Tu pioches la case ${caseIndex + 1}. Gain net : +${PAYOUT_MULT * STAKE - STAKE} reps.`
            : `🐔 Le bon numéro était ${draw + 1}. Tu as misé sur ${caseIndex + 1}. -${STAKE} reps.`,
    })
}
