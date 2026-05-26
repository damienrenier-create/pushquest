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
import { ALL_TREES, TREE_KIND_CONFIGS } from "@/lib/gamebook/maps"
import { readEnergySnapshot, grantRewardOnSnapshot, computeAvailableEnergy } from "@/lib/gamebook/energy"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
// v3.23d — Source de vérité unique : ALL_TREES (catalogue centralisé incluant les 5 types).
// Chaque arbre référence sa config kind via TREE_KIND_CONFIGS (bonus + maxPerDay).

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
    // v3.23k — 1 sec de gainage = 1/5 énergie (cohérent avec scoring 5s=1pt)
    return sets.reduce((sum: number, s: { exercise: string; reps: number }) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps), 0)
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
    const treeInstance = treeId ? ALL_TREES.find((t) => t.id === treeId) : null
    if (!treeInstance) {
        return NextResponse.json({ ok: false, reason: "Arbre inconnu." }, { status: 400 })
    }
    const treeConfig = TREE_KIND_CONFIGS[treeInstance.kind]

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
    const taken = state.counts[treeInstance.id] ?? 0
    if (taken >= treeConfig.maxPerDay) {
        return NextResponse.json({
            ok: false,
            reason: "Cet arbre est dépouillé pour aujourd'hui. Reviens demain.",
            fruitsTaken: state,
        })
    }

    const todayReps = await getTodayReps(userId)

    // v3.10.1 — Reward ajusté au ratio de difficulté pour cohérence
    // v3.23d — Bonus dépend du type d'arbre (apple 80, cherry 40, pear 60, peach 100, coconut 150).
    //          Maléfica (poison) a un bonus NÉGATIF (-30) → bypass applyRatio.
    const ratio = await getUserDifficultyRatio(userId)
    const reward = treeConfig.bonusReps >= 0
        ? applyRatio(treeConfig.bonusReps, ratio)
        : treeConfig.bonusReps  // malus à pleine intensité

    // v3.23f — Modèle bonusSurplus : reward positif → bonusSurplus++. Reward négatif (Maléfica)
    //          → consomme bonusSurplus d'abord puis spentToday. Plus de perte à minuit.
    const snap = readEnergySnapshot(progress, today)
    const nextSnap = grantRewardOnSnapshot(snap, reward, today)
    const newState: FruitsTakenState = {
        date: today,
        counts: { ...state.counts, [treeInstance.id]: taken + 1 },
    }

    // v3.24a-4 — Si mission jardinier active (et arrosoir pas encore obtenu),
    // on push le kind du fruit cueilli dans jardinierFruitOrder (pour vérif séquence ensuite).
    const missionActive = (progress as { jardinierMissionActive?: boolean }).jardinierMissionActive === true
    const arrosoirGiven = (progress as { jardinierArrosoirGiven?: boolean }).jardinierArrosoirGiven === true
    let newJardinierFruitOrder: string[] | undefined = undefined
    if (missionActive && !arrosoirGiven) {
        const orderRaw = (progress as { jardinierFruitOrder?: unknown }).jardinierFruitOrder
        const existing = Array.isArray(orderRaw)
            ? (orderRaw as unknown[]).filter((x): x is string => typeof x === "string")
            : []
        newJardinierFruitOrder = [...existing, treeInstance.kind]
    }

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            energySpentToday: nextSnap.energySpentToday,
            energySpentDate: nextSnap.energySpentDate,
            bonusSurplus: nextSnap.bonusSurplus,
            fruitsTaken: newState,
            ...(newJardinierFruitOrder !== undefined ? { jardinierFruitOrder: newJardinierFruitOrder } : {}),
            lastSeen: new Date(),
        },
    })

    const isCreator = await isCreatorAccount(userId)
    return NextResponse.json({
        ok: true,
        treeId: treeInstance.id,
        treeKind: treeInstance.kind,
        reward,
        remaining: treeConfig.maxPerDay - (taken + 1),
        availableEnergy: padAvailableEnergyForCreator(computeAvailableEnergy(todayReps, nextSnap), isCreator),
        energySpentToday: nextSnap.energySpentToday,
        bonusSurplus: nextSnap.bonusSurplus,
        fruitsTaken: newState,
    })
}
