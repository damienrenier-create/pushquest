// src/app/api/gamebook/take-fruit/route.ts
//
// v3.8.1 — POST : cueille un fruit sur un arbre de Pépiteville.
// Payload : { treeId: "apple_tree_1" | "apple_tree_2" }
//
// Logique :
//   - max 3 fruits par arbre par jour (reset à minuit Europe/Paris)
//   - chaque fruit crédite 80 reps (energySpentToday -= 80)
//   - état persisté dans GamebookProgress.fruitsTaken (Json)
//
// Format de fruitsTaken : { date: "YYYY-MM-DD", counts: { "apple_tree_1": n, "apple_tree_2": n } }
// Si date != today → reset à {} avant de cueillir.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isGamebookFrozen } from "@/lib/gamebook/antiCheat"
import { isCreatorAccount, padAvailableEnergyForCreator } from "@/lib/gamebook/creator"
import { getUserDifficultyRatio, applyRatio } from "@/lib/gamebook/difficulty"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
// v3.23d — Ajout de apple_tree_3 (Hautes-Pâtes, à côté de la Tour). Géré côté client
// via HAUTESPATES_APPLE_TREES en plus de PEPITEVILLE_APPLE_TREES.
const VALID_TREE_IDS = ["apple_tree_1", "apple_tree_2", "apple_tree_3"] as const
const MAX_FRUITS_PER_TREE_PER_DAY = 3
const FRUIT_REWARD = 80

interface FruitsTakenState {
    date: string
    counts: Record<string, number>
}

function parseFruitsTaken(raw: unknown, today: string): FruitsTakenState {
    if (
        raw &&
        typeof raw === "object" &&
        !Array.isArray(raw) &&
        "date" in raw &&
        typeof (raw as { date: unknown }).date === "string" &&
        (raw as { date: string }).date === today &&
        "counts" in raw
    ) {
        const counts = (raw as { counts: unknown }).counts
        if (counts && typeof counts === "object" && !Array.isArray(counts)) {
            const safeCounts: Record<string, number> = {}
            for (const [k, v] of Object.entries(counts)) {
                if (typeof v === "number" && Number.isFinite(v)) {
                    safeCounts[k] = Math.max(0, Math.floor(v))
                }
            }
            return { date: today, counts: safeCounts }
        }
    }
    return { date: today, counts: {} }
}

async function getTodayReps(userId: string): Promise<number> {
    const today = getTodayISO()
    const sets = await prisma.exerciseSet.findMany({
        where: { userId, date: today },
    })
    return sets.reduce((sum: number, s: { reps: number }) => sum + s.reps, 0)
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: Record<string, unknown>
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    const treeId = typeof body.treeId === "string" ? body.treeId : null
    if (!treeId || !(VALID_TREE_IDS as readonly string[]).includes(treeId)) {
        return NextResponse.json({ ok: false, reason: "Arbre inconnu." }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }

    if (isGamebookFrozen(progress as { gamebookFrozenUntil?: Date | null })) {
        return NextResponse.json({
            ok: false,
            reason: "Gamebook gelé.",
            frozen: true,
            frozenUntil: (progress as { gamebookFrozenUntil?: Date | null }).gamebookFrozenUntil,
        })
    }

    const today = getTodayISO()
    const state = parseFruitsTaken(progress.fruitsTaken, today)
    const taken = state.counts[treeId] ?? 0
    if (taken >= MAX_FRUITS_PER_TREE_PER_DAY) {
        return NextResponse.json({
            ok: false,
            reason: "Cet arbre est dépouillé pour aujourd'hui. Reviens demain.",
            fruitsTaken: state,
        })
    }

    const storedDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
    const storedSpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
    const currentSpent = storedDate === today ? storedSpent : 0
    const todayReps = await getTodayReps(userId)

    // v3.10.1 — Reward ajusté au ratio de difficulté pour cohérence (onboarding reçoit moins
    // en absolu, mais le même % par rapport à son quota quotidien).
    const ratio = await getUserDifficultyRatio(userId)
    const reward = applyRatio(FRUIT_REWARD, ratio)
    // Crédit immédiat : energySpentToday -= reward (peut devenir négatif → surplus, cohérent v3.8)
    const newSpent = currentSpent - reward
    const newState: FruitsTakenState = {
        date: today,
        counts: { ...state.counts, [treeId]: taken + 1 },
    }

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            energySpentToday: newSpent,
            energySpentDate: today,
            fruitsTaken: newState,
            lastSeen: new Date(),
        },
    })

    const isCreator = await isCreatorAccount(userId)
    return NextResponse.json({
        ok: true,
        treeId,
        reward,  // v3.10.1 — ajusté au ratio (le client affiche cette valeur, pas FRUIT_REWARD)
        remaining: MAX_FRUITS_PER_TREE_PER_DAY - (taken + 1),
        availableEnergy: padAvailableEnergyForCreator(todayReps - newSpent, isCreator),
        energySpentToday: newSpent,
        fruitsTaken: newState,
    })
}
