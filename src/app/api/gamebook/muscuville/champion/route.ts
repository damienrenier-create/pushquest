// src/app/api/gamebook/muscuville/champion/route.ts
//
// v3.35 — POST : interaction avec un des 4 champions de l'arène de Muscuville.
// Body : { championId: "plank" | "pushup" | "pullup" | "squat" }
//
// 1ʳᵉ confrontation :
//   - Au 1er talk, snapshot du record all-time du joueur sur cet exercice (= baseline).
//   - À chaque retalk, on regarde le nouveau record all-time. Si > baseline → champion
//     battu. Le record stocké comme baseline ne change plus (le défi est validé une fois).
//   - "1 encodage" : en pratique le joueur fait UNE série post-talk qui doit dépasser
//     son ancien record. Tant que le record actuel ≤ baseline, le défi reste ouvert.
//
// Revanche (après 1ʳᵉ confrontation gagnée) :
//   - Défi : avoir le plus gros VOLUME du jour all-time sur cet exercice.
//   - On regarde sum(reps) GROUP BY date. Le jour avec le plus grand total = record volume.
//   - Si ce jour record = aujourd'hui → revanche gagnée + badge 800 XP.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

type ChampionId = "plank" | "pushup" | "pullup" | "squat"

const EXERCISE_BY_CHAMPION: Record<ChampionId, string> = {
    plank: "PLANK",
    pushup: "PUSHUP",
    pullup: "PULLUP",
    squat: "SQUAT",
}

const CHAMPION_LABEL: Record<ChampionId, string> = {
    plank: "gainage",
    pushup: "pompes",
    pullup: "tractions",
    squat: "squats",
}

const CHAMPION_UNIT: Record<ChampionId, string> = {
    plank: "secondes",
    pushup: "reps",
    pullup: "reps",
    squat: "reps",
}

const BADGE_KEY: Record<ChampionId, string> = {
    plank: "gamebook_revanche_gainage",
    pushup: "gamebook_revanche_pompes",
    pullup: "gamebook_revanche_tractions",
    squat: "gamebook_revanche_squats",
}

interface BaselineEntry {
    max: number
    atIso: string
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { championId?: string }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const championId = body.championId as ChampionId
    if (!championId || !(championId in EXERCISE_BY_CHAMPION)) {
        return NextResponse.json({ ok: false, reason: "Champion inconnu." }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    const exercise = EXERCISE_BY_CHAMPION[championId]
    const label = CHAMPION_LABEL[championId]
    const unit = CHAMPION_UNIT[championId]

    const beaten: string[] = Array.isArray((progress as { muscuvilleChampionsBeaten?: unknown }).muscuvilleChampionsBeaten)
        ? ((progress as { muscuvilleChampionsBeaten: unknown[] }).muscuvilleChampionsBeaten as string[])
        : []
    const revanche: string[] = Array.isArray((progress as { muscuvilleChampionsRevanche?: unknown }).muscuvilleChampionsRevanche)
        ? ((progress as { muscuvilleChampionsRevanche: unknown[] }).muscuvilleChampionsRevanche as string[])
        : []
    const baselineRaw = (progress as { muscuvilleChampionsBaseline?: unknown }).muscuvilleChampionsBaseline
    const baseline = (baselineRaw && typeof baselineRaw === "object" && !Array.isArray(baselineRaw))
        ? (baselineRaw as Record<string, BaselineEntry>)
        : {}

    const alreadyBeaten = beaten.includes(championId)
    const alreadyRevanche = revanche.includes(championId)

    // === REVANCHE (après 1ʳᵉ confrontation déjà gagnée) ===
    if (alreadyBeaten) {
        if (alreadyRevanche) {
            return NextResponse.json({
                ok: true,
                alreadyDone: true,
                message: `*Le Champion du ${label} t'incline la tête.* Tu as gagné les deux manches. Va profiter du Nexus.`,
            })
        }
        // Volume du jour all-time : sum(reps) group by date sur cet exo
        const allSets = await prisma.exerciseSet.findMany({ where: { userId, exercise } })
        const byDate = new Map<string, number>()
        for (const s of allSets) {
            byDate.set(s.date, (byDate.get(s.date) ?? 0) + s.reps)
        }
        const today = getTodayISO()
        const todayVolume = byDate.get(today) ?? 0
        let recordDate = today
        let recordVolume = 0
        for (const [d, v] of byDate.entries()) {
            if (v > recordVolume) { recordVolume = v; recordDate = d }
        }
        if (todayVolume === recordVolume && todayVolume > 0 && recordDate === today) {
            // Win revanche
            const newRevanche = [...revanche, championId]
            // v3.37 (règle d) — Réussir un défi PNJ : +10 happiness à l'animal
            const { applyHappinessDelta, HAPPINESS_DELTAS } = await import("@/lib/gamebook/happinessChanges")
            const newTam = applyHappinessDelta((progress as { tamagotchi?: unknown }).tamagotchi, HAPPINESS_DELTAS.PNJ_CHALLENGE_WIN)
            await (prisma as any).gamebookProgress.update({
                where: { id: progress.id },
                data: {
                    muscuvilleChampionsRevanche: newRevanche,
                    ...(newTam ? { tamagotchi: newTam } : {}),
                },
            })
            // Octroyer le badge (BadgeEvent UNIQUE_AWARDED multi-détenteurs)
            try {
                await (prisma as any).badgeEvent.create({
                    data: {
                        eventType: "UNIQUE_AWARDED",
                        badgeKey: BADGE_KEY[championId],
                        fromUserId: userId,
                        toUserId: userId,
                    },
                })
            } catch (e) {
                console.warn("[champion revanche badge] failed", e)
            }
            return NextResponse.json({
                ok: true,
                revancheWon: true,
                message: `🏆 *Le Champion du ${label} s'incline.* « Aujourd'hui : ${todayVolume} ${unit}. Mon record all-time, c'est toi. Tiens, un badge — tu l'as bien mérité (+800 XP). »`,
            })
        }
        return NextResponse.json({
            ok: true,
            revancheWon: false,
            todayVolume,
            recordVolume,
            recordDate,
            message: `*Le Champion du ${label} secoue la tête.* « Aujourd'hui tu fais ${todayVolume} ${unit}. Le record all-time, c'est ${recordVolume} (${recordDate}). Reviens quand tu l'auras battu DANS UNE JOURNÉE. »`,
        })
    }

    // === 1ʳᵉ CONFRONTATION ===
    // Max all-time actuel sur cet exo (= meilleure série jamais réalisée)
    const allSets = await prisma.exerciseSet.findMany({ where: { userId, exercise }, select: { reps: true } })
    const currentMax = allSets.reduce((m, s) => Math.max(m, s.reps), 0)

    const existing = baseline[championId]
    if (!existing) {
        // 1er talk : snapshot baseline
        const newBaseline = { ...baseline, [championId]: { max: currentMax, atIso: new Date().toISOString() } }
        await (prisma as any).gamebookProgress.update({
            where: { id: progress.id },
            data: { muscuvilleChampionsBaseline: newBaseline },
        })
        return NextResponse.json({
            ok: true,
            baselineSet: true,
            baseline: currentMax,
            message: `*Le Champion du ${label} pose son regard sur toi.* « Ton record actuel : ${currentMax} ${unit}. Pour me battre, fais une nouvelle série qui dépasse ce chiffre. Une seule chance. Reviens me voir quand c'est fait. »`,
        })
    }

    // 2e+ talk : compare currentMax à existing.max
    if (currentMax > existing.max) {
        // Champion battu !
        const newBeaten = [...beaten, championId]
        // v3.37 (règle d) — +10 happiness sur défi PNJ réussi (1ʳᵉ confrontation)
        const { applyHappinessDelta, HAPPINESS_DELTAS } = await import("@/lib/gamebook/happinessChanges")
        const newTam = applyHappinessDelta((progress as { tamagotchi?: unknown }).tamagotchi, HAPPINESS_DELTAS.PNJ_CHALLENGE_WIN)
        await (prisma as any).gamebookProgress.update({
            where: { id: progress.id },
            data: {
                muscuvilleChampionsBeaten: newBeaten,
                ...(newTam ? { tamagotchi: newTam } : {}),
            },
        })
        return NextResponse.json({
            ok: true,
            championBeaten: true,
            championId,
            previousRecord: existing.max,
            newRecord: currentMax,
            championsBeatenCount: newBeaten.length,
            message: `🏆 *Le Champion du ${label} hoche la tête, vaincu.* « ${currentMax} ${unit}. Tu m'as dépassé. Le prix de passage vers Vegas chute. Si tu veux ma revanche, reviens. »`,
        })
    }

    return NextResponse.json({
        ok: true,
        championBeaten: false,
        baseline: existing.max,
        currentMax,
        message: `*Le Champion du ${label} t'observe.* « Ton record est toujours de ${currentMax} ${unit}. Tu dois dépasser ${existing.max}. Va t'entraîner. »`,
    })
}
