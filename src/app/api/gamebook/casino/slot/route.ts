// src/app/api/gamebook/casino/slot/route.ts
//
// v3.24b-4 — POST : slot machine (3 reels).
// Mise fixe : 5 reps. Payout selon combinaison :
//   3 identiques cerises : ×3
//   3 identiques bars    : ×5
//   3 identiques sevens  : ×20
//   3 identiques (autres): ×10
//   2 identiques         : ×1 (rendu mise)
//   sinon                : 0
//
// Modulation : un peu plus de chance à 21h-23h (heure du quota) et le 1er du mois.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { getActiveBoost, applyBoostToPayout, consumeBoostPatch } from "@/lib/gamebook/casinoBoost"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const STAKE = 5
const SYMBOLS = ["🍒", "🍋", "🍇", "🔔", "💎", "7️⃣"]

function getParisDate() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }))
}

function pickSymbol(luckyBoost: number): string {
    // luckyBoost = 0..0.3 : décale légèrement vers 7️⃣ et 💎 (les rares)
    if (Math.random() < luckyBoost) {
        return Math.random() < 0.5 ? "💎" : "7️⃣"
    }
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
}

function computePayout(reels: string[]): { mult: number; combo: string } {
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
        const s = reels[0]
        if (s === "🍒") return { mult: 3, combo: "Triple cerises" }
        if (s === "7️⃣") return { mult: 20, combo: "Triple sevens JACKPOT" }
        if (s === "💎") return { mult: 15, combo: "Triple diamants" }
        if (s === "🔔") return { mult: 10, combo: "Triple cloches" }
        return { mult: 8, combo: `Triple ${s}` }
    }
    if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
        return { mult: 1, combo: "Paire (mise rendue)" }
    }
    return { mult: 0, combo: "" }
}

export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    const today = getTodayISO()
    const energyDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
    const energySpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
    const currentSpent = energyDate === today ? energySpent : 0

    const sets = await prisma.exerciseSet.findMany({ where: { userId, date: today } })
    const todayReps = sets.reduce((sum, s) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps), 0)
    const bonusSurplus = (progress as { bonusSurplus?: number }).bonusSurplus ?? 0
    const available = todayReps - currentSpent + bonusSurplus
    if (available < STAKE) {
        return NextResponse.json({ ok: false, reason: `Pas assez de reps : ${available}, ${STAKE} requis.` })
    }

    // Modulation : heure 21-23 ou 1er du mois → petit boost luck
    const d = getParisDate()
    const hour = d.getHours()
    const day = d.getDate()
    let luckyBoost = 0
    if (hour >= 21 && hour <= 23) luckyBoost += 0.10
    if (day === 1) luckyBoost += 0.15

    const reels = [pickSymbol(luckyBoost), pickSymbol(luckyBoost), pickSymbol(luckyBoost)]
    const { mult, combo } = computePayout(reels)
    const rawPayout = STAKE * mult
    const boost = getActiveBoost(progress as any)
    const payout = applyBoostToPayout(rawPayout, boost)
    const netDelta = payout > 0 ? -(payout - STAKE) : STAKE
    const newSpent = currentSpent + netDelta

    const slotDate = (progress as { slotMachinesDate?: string }).slotMachinesDate ?? ""
    const playsBefore = slotDate === today ? ((progress as { slotMachinesPlayedToday?: number }).slotMachinesPlayedToday ?? 0) : 0

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            energySpentToday: newSpent,
            energySpentDate: today,
            slotMachinesDate: today,
            slotMachinesPlayedToday: playsBefore + 1,
            ...consumeBoostPatch(),
        },
    })

    const boostNote = boost !== 0 && payout > 0 ? ` (croupier ${boost > 0 ? "+" : ""}${boost}%)` : ""
    return NextResponse.json({
        ok: true,
        reels,
        mult,
        combo,
        boost,
        payout,
        net: payout - STAKE,
        message: mult === 0
            ? `${reels.join(" ")} — Rien. Tu perds ${STAKE} reps.`
            : mult === 1
                ? `${reels.join(" ")} — ${combo}. Mise rendue.`
                : `${reels.join(" ")} — ${combo} ! +${payout - STAKE} reps nets${boostNote}.`,
    })
}
