// src/app/api/gamebook/muscuville/rocks-pay/route.ts
//
// v3.35 — POST : tente de payer le prix de passage des rochers (sortie Vegas).
//
// Prix : 4000 reps × (1 - champions_battus/4).
//   - 0/4 → 4000 reps
//   - 1/4 → 3000 reps
//   - 2/4 → 2000 reps
//   - 3/4 → 1000 reps
//   - 4/4 → 0 reps (gratuit)
//
// Si l'énergie disponible suffit : dépense + muscuvilleRocksPassed = true.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { readEnergySnapshot, spendEnergyOnSnapshot, computeAvailableEnergy, getTodayRepsForEnergy } from "@/lib/gamebook/energy"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const BASE_ROCKS_PRICE = 4000

function computeRocksPrice(championsBeatenCount: number): number {
    const factor = Math.max(0, 1 - championsBeatenCount / 4)
    return Math.round(BASE_ROCKS_PRICE * factor)
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

    if ((progress as { muscuvilleRocksPassed?: boolean }).muscuvilleRocksPassed === true) {
        return NextResponse.json({ ok: true, alreadyPassed: true, message: "🪨 Les rochers sont déjà fracassés. Passage libre." })
    }

    const beaten: string[] = Array.isArray((progress as { muscuvilleChampionsBeaten?: unknown }).muscuvilleChampionsBeaten)
        ? ((progress as { muscuvilleChampionsBeaten: unknown[] }).muscuvilleChampionsBeaten as string[])
        : []
    const price = computeRocksPrice(beaten.length)

    const today = getTodayISO()
    const snap = readEnergySnapshot(progress, today)
    const todayReps = await getTodayRepsForEnergy(userId)
    const available = computeAvailableEnergy(todayReps, snap)

    if (price > 0 && available < price) {
        return NextResponse.json({
            ok: false,
            reason: "not_enough",
            price,
            available,
            championsBeaten: beaten.length,
            message: `🪨 Il te faut ${price} reps pour pousser les rochers. Tu en as ${available}. (${beaten.length}/4 champions battus → ${100 - beaten.length * 25}% du prix)`,
        })
    }

    let updateData: Record<string, unknown> = { muscuvilleRocksPassed: true }
    if (price > 0) {
        const next = spendEnergyOnSnapshot(snap, price, today)
        updateData = {
            ...updateData,
            energySpentToday: next.energySpentToday,
            energySpentDate: today,
            bonusSurplus: next.bonusSurplus,
        }
    }

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: updateData,
    })

    return NextResponse.json({
        ok: true,
        paid: true,
        price,
        championsBeaten: beaten.length,
        message: price === 0
            ? `🪨💥 Les 4 champions ont été battus — les rochers tombent d'eux-mêmes. Passage GRATUIT vers Vegas.`
            : `🪨💥 Tu pousses les rochers (${price} reps dépensés). Passage ouvert vers Vegas.`,
    })
}
