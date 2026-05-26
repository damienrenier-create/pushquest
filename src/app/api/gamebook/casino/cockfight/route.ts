// src/app/api/gamebook/casino/cockfight/route.ts
//
// v3.24b-3 — POST : combats de coqs (4 coqs avec stats différentes).
// Body : { cockId: "rocky" | "el_diablo" | "torpedo" | "lucky", stake: 20..200 }
//
// 1×/jour, à partir de 21h (Europe/Paris). Mise 20-200.
// Chaque coq a une probabilité de victoire fixe :
//   rocky    : 50% (favori) → payout ×1.8
//   el_diablo: 30% → payout ×3
//   torpedo  : 15% → payout ×6
//   lucky    : 5%  → payout ×18 (outsider)

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { getActiveBoost, applyBoostToPayout, consumeBoostPatch } from "@/lib/gamebook/casinoBoost"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

const COCKS: Record<string, { name: string; prob: number; payout: number; emoji: string }> = {
    rocky:     { name: "ROCKY",     prob: 0.50, payout: 1.8, emoji: "🐓" },
    el_diablo: { name: "EL DIABLO", prob: 0.30, payout: 3.0, emoji: "🔥" },
    torpedo:   { name: "TORPEDO",   prob: 0.15, payout: 6.0, emoji: "💨" },
    lucky:     { name: "LUCKY",     prob: 0.05, payout: 18.0, emoji: "🍀" },
}

function getParisHour(): number {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }))
    return d.getHours()
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { cockId?: string; stake?: number }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const cockId = body.cockId
    if (!cockId || !(cockId in COCKS)) {
        return NextResponse.json({ ok: false, reason: "Coq inconnu." }, { status: 400 })
    }
    const stake = Math.max(20, Math.min(200, Math.floor(body.stake ?? 20)))

    // Heure : 21h+ requis
    const hour = getParisHour()
    if (hour < 21) {
        return NextResponse.json({ ok: false, reason: `Les combats commencent à 21h (il est ${hour}h).` })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    const today = getTodayISO()
    const lastDate = (progress as { cockfightDate?: string }).cockfightDate ?? ""
    if (lastDate === today) {
        return NextResponse.json({ ok: false, reason: "Tu as déjà parié aujourd'hui. Reviens demain à 21h." })
    }

    // Vérifier énergie
    const energyDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
    const energySpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
    const currentSpent = energyDate === today ? energySpent : 0
    const sets = await prisma.exerciseSet.findMany({ where: { userId, date: today } })
    const todayReps = sets.reduce((sum, s) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps), 0)
    const bonusSurplus = (progress as { bonusSurplus?: number }).bonusSurplus ?? 0
    const available = todayReps - currentSpent + bonusSurplus
    if (available < stake) {
        return NextResponse.json({ ok: false, reason: `Pas assez de reps : ${available} dispo, ${stake} requis.` })
    }

    const cock = COCKS[cockId]
    const won = Math.random() < cock.prob

    // Quel coq a gagné ? On simule un tirage cohérent pondéré
    const draw = Math.random()
    let winnerId = "rocky"
    let acc = 0
    for (const [id, c] of Object.entries(COCKS)) {
        acc += c.prob
        if (draw < acc) { winnerId = id; break }
    }
    // Override : si on a déterminé que le user gagne, on force son coq comme winnerId
    if (won) winnerId = cockId

    const boost = getActiveBoost(progress as any)
    const rawPayout = won ? Math.round(stake * cock.payout) : 0
    const boostedPayout = applyBoostToPayout(rawPayout, boost)
    const netDelta = won ? -(boostedPayout - stake) : stake
    const newSpent = currentSpent + netDelta

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            energySpentToday: newSpent,
            energySpentDate: today,
            cockfightDate: today,
            ...consumeBoostPatch(),
        },
    })

    const boostNote = boost !== 0 && won ? ` (croupier ${boost > 0 ? "+" : ""}${boost}%)` : ""
    return NextResponse.json({
        ok: true,
        won,
        cockId,
        winnerId,
        winnerName: COCKS[winnerId].name,
        stake,
        boost,
        payout: won ? boostedPayout : 0,
        message: won
            ? `🏆 ${cock.emoji} ${cock.name} gagne ! +${boostedPayout - stake} reps nets${boostNote}.`
            : `💀 ${COCKS[winnerId].emoji} ${COCKS[winnerId].name} l'emporte. Tu perds ${stake} reps.`,
    })
}
