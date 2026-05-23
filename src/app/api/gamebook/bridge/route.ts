// src/app/api/gamebook/bridge/route.ts
//
// API du défi du Pont Pépite d'Azuria.
//
// POST /api/gamebook/bridge
//   body: { action: "challengePnj" | "claimPioneerBadge", pnjId?: string }
//
//   "challengePnj" : tente de battre un PNJ (vérifie côté serveur, marque comme battu)
//   "claimPioneerBadge" : donne le badge Pionnier (200 XP) si pas déjà fait
//
// IMPORTANT v3.2 : la création de badge utilise enfin le bon modèle Prisma :
//   - badgeKey (pas badgeId)
//   - BadgeEvent type=UNIQUE_AWARDED pour permettre plusieurs détenteurs
//   - XpAdjustment.date obligatoire

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO, getYesterdayISO } from "@/lib/challenge"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

const BADGE_KEY_PIONNIER = "gamebook_pionnier"
const XP_REWARD_PIONNIER = 200

// v3.9 — Badge bonus pour CHAMPIO si vaincu en tant que #1 de la veille.
const BADGE_KEY_CHAMPIO_STAR = "gamebook_champio_star"
const XP_REWARD_CHAMPIO_STAR = 200

// v3.9 — Seuils dégressifs pour les PNJ exercice du pont.
// Base 100, -15 par victoire (cumul global du PNJ), minimum 25.
const BRIDGE_PNJ_THRESHOLD_BASE = 100
const BRIDGE_PNJ_THRESHOLD_STEP = 15
const BRIDGE_PNJ_THRESHOLD_MIN = 25
const BRIDGE_VICTORIES_KEY = "bridgePnjVictories"

// PNJ et leurs défis (doit matcher BRIDGE_PNJS dans maps.ts)
type BridgeChallenge =
    | { kind: "exercise"; exercise: "PUSHUP" | "SQUAT" | "GAINAGE" | "PULLUP" | "CARDIO" }
    | { kind: "topYesterday" }

const BRIDGE_PNJS_SERVER: Record<string, BridgeChallenge> = {
    pnj_pompo:   { kind: "exercise", exercise: "PUSHUP" },
    pnj_squatto: { kind: "exercise", exercise: "SQUAT" },
    pnj_gainax:  { kind: "exercise", exercise: "GAINAGE" },
    pnj_champio: { kind: "topYesterday" },
}

// v3.9 — Lit le compteur global de victoires pour chaque PNJ depuis GlobalConfig.
async function readBridgeVictories(): Promise<Record<string, number>> {
    const cfg = await (prisma as any).globalConfig.findUnique({
        where: { key: BRIDGE_VICTORIES_KEY },
    })
    if (!cfg?.value) return {}
    try {
        const parsed = JSON.parse(cfg.value as string)
        if (parsed && typeof parsed === "object") return parsed as Record<string, number>
    } catch {/* fallback */ }
    return {}
}

// Incrémente le compteur de victoires d'un PNJ (cumul global, sert au seuil dégressif).
async function incrementBridgeVictory(pnjId: string): Promise<void> {
    const current = await readBridgeVictories()
    const next = { ...current, [pnjId]: (current[pnjId] ?? 0) + 1 }
    const payload = JSON.stringify(next)
    await (prisma as any).globalConfig.upsert({
        where: { key: BRIDGE_VICTORIES_KEY },
        update: { value: payload },
        create: { key: BRIDGE_VICTORIES_KEY, value: payload },
    })
}

// Calcule le seuil dynamique pour un PNJ exercice selon son compteur de victoires.
function thresholdForVictories(victories: number): number {
    return Math.max(BRIDGE_PNJ_THRESHOLD_MIN, BRIDGE_PNJ_THRESHOLD_BASE - BRIDGE_PNJ_THRESHOLD_STEP * victories)
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

    const action = body.action
    if (action === "claimPioneerBadge") {
        return claimPioneerBadge(userId)
    }
    if (action === "challengePnj") {
        const pnjId = typeof body.pnjId === "string" ? body.pnjId : null
        if (!pnjId || !(pnjId in BRIDGE_PNJS_SERVER)) {
            return NextResponse.json({ error: "Unknown pnjId" }, { status: 400 })
        }
        return challengePnj(userId, pnjId)
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}

// =====================================================
// Badge Pionnier (donné par le Monstre après l'arbre)
// =====================================================
async function claimPioneerBadge(userId: string) {
    const progress = await prisma.gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ error: "No progress" }, { status: 400 })
    }
    if (!progress.treeObstacleCleared) {
        return NextResponse.json({ ok: false, reason: "Tu n'as pas encore franchi l'arbre." })
    }
    if (progress.pioneerBadgeAwarded) {
        return NextResponse.json({ ok: false, reason: "Badge déjà reçu." })
    }

    // Vérifier que la BadgeDefinition existe (si initBadges a tourné depuis le déploiement)
    let badgeDefExists = false
    try {
        const def = await (prisma as { badgeDefinition: { findUnique: (a: unknown) => Promise<unknown> } }).badgeDefinition.findUnique({
            where: { key: BADGE_KEY_PIONNIER },
        })
        badgeDefExists = !!def
    } catch (e) {
        console.warn("[bridge] could not check badge definition", e)
    }

    // Marquer comme attribué côté gamebook
    await prisma.gamebookProgress.update({
        where: { id: progress.id },
        data: { pioneerBadgeAwarded: true },
    })

    // Créer un BadgeEvent UNIQUE_AWARDED (pattern des badges non-transférables type "Premier 50 pompes")
    // Ça permet d'avoir plusieurs détenteurs sans toucher au BadgeOwnership singleton.
    if (badgeDefExists) {
        try {
            // Vérifier qu'on n'a pas déjà attribué (idempotence)
            const existing = await (prisma as { badgeEvent: { findFirst: (a: unknown) => Promise<unknown> } }).badgeEvent.findFirst({
                where: {
                    badgeKey: BADGE_KEY_PIONNIER,
                    toUserId: userId,
                    eventType: "UNIQUE_AWARDED",
                },
            })
            if (!existing) {
                await (prisma as { badgeEvent: { create: (a: unknown) => Promise<unknown> } }).badgeEvent.create({
                    data: {
                        badgeKey: BADGE_KEY_PIONNIER,
                        fromUserId: null,
                        toUserId: userId,
                        eventType: "UNIQUE_AWARDED",
                        previousValue: 0,
                        newValue: 1,
                        metadata: JSON.stringify({
                            source: "gamebook_route1_tree",
                            xpReward: XP_REWARD_PIONNIER,
                        }),
                    },
                })
            }
        } catch (e) {
            console.warn("[bridge] could not create BadgeEvent", e)
        }
    }

    // XP via XpAdjustment (champ `date` OBLIGATOIRE, c'était le bug v3.1)
    try {
        const today = getTodayISO()
        // Vérifier qu'on n'a pas déjà donné les XP (idempotence)
        const existingXp = await (prisma as { xpAdjustment: { findFirst: (a: unknown) => Promise<unknown> } }).xpAdjustment.findFirst({
            where: {
                userId,
                reason: "BADGE_PIONNIER_GAMEBOOK",
            },
        })
        if (!existingXp) {
            await (prisma as { xpAdjustment: { create: (a: unknown) => Promise<unknown> } }).xpAdjustment.create({
                data: {
                    userId,
                    amount: XP_REWARD_PIONNIER,
                    reason: "BADGE_PIONNIER_GAMEBOOK",
                    date: today,
                },
            })
        }
    } catch (e) {
        console.warn("[bridge] could not create XpAdjustment", e)
    }

    return NextResponse.json({
        ok: true,
        awarded: true,
        xp: XP_REWARD_PIONNIER,
        badgeKey: BADGE_KEY_PIONNIER,
    })
}

// =====================================================
// Défi d'un PNJ du pont
// =====================================================
async function challengePnj(userId: string, pnjId: string) {
    const challenge = BRIDGE_PNJS_SERVER[pnjId]
    const progress = await prisma.gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ error: "No progress" }, { status: 400 })
    }

    // v3.5 : si déjà vaincu, on accepte juste le passage sans validation (vaincu = pour toujours)
    const alreadyDefeated = Array.isArray(progress.bridgePnjDefeated)
        ? (progress.bridgePnjDefeated as string[])
        : []
    if (alreadyDefeated.includes(pnjId)) {
        return NextResponse.json({
            ok: true,
            reason: "Déjà vaincu.",
            defeated: alreadyDefeated,
        })
    }

    const today = getTodayISO()

    // v3.8.5 — Mode créateur (isSystem) : bypass tous les checks de défi.
    const creatorCheck = await (prisma as any).user.findUnique({
        where: { id: userId },
        select: { isSystem: true },
    })
    const isCreator = creatorCheck?.isSystem === true
    if (isCreator) {
        const newDefeated = [...alreadyDefeated, pnjId]
        const existingLastBeaten = (progress.bridgePnjLastBeatenDate as Record<string, string>) ?? {}
        const newLastBeaten = { ...existingLastBeaten, [pnjId]: today }
        await prisma.gamebookProgress.update({
            where: { id: progress.id },
            data: {
                bridgePnjDefeated: newDefeated,
                bridgePnjLastBeatenDate: newLastBeaten,
            },
        })
        return NextResponse.json({ ok: true, defeated: newDefeated, creator: true })
    }

    // v3.9 — Variables qui peuvent être renseignées pendant la validation
    // (utilisées dans la réponse JSON finale)
    let earnedChampioStarBadge = false
    let thresholdUsed: number | null = null

    // ============= Validation de la condition =============
    if (challenge.kind === "exercise") {
        // v3.9 — Seuil dégressif basé sur le nombre de victoires cumulées de CE PNJ
        const victories = await readBridgeVictories()
        const victoryCount = victories[pnjId] ?? 0
        const threshold = thresholdForVictories(victoryCount)
        thresholdUsed = threshold

        const sets = await prisma.exerciseSet.findMany({
            where: { userId, date: today, exercise: challenge.exercise },
        })
        const total = sets.reduce((sum: number, s: { reps: number }) => sum + s.reps, 0)
        if (total < threshold) {
            return NextResponse.json({
                ok: false,
                reason: `Il faut ${threshold} ${labelExercise(challenge.exercise)} aujourd'hui. T'en as ${total}.`,
                required: threshold,
                current: total,
            })
        }
    } else if (challenge.kind === "topYesterday") {
        // v3.9 — CHAMPIO accepte 3 chemins de victoire :
        //   1. #1 cumulés hier → passe + badge "Star du Pont d'Hier" (200 XP)
        //   2. Top 3 cumulés hier → passe SANS badge
        //   3. #1 cumulés aujourd'hui → passe SANS badge
        const yesterday = getYesterdayISO()

        // -- Hier (exclut isSystem)
        const allYesterday = await prisma.exerciseSet.findMany({
            where: { date: yesterday, user: { isSystem: false } },
        })
        const sumsYesterday: Record<string, number> = {}
        for (const s of allYesterday) {
            sumsYesterday[s.userId] = (sumsYesterday[s.userId] ?? 0) + s.reps
        }
        const sortedYesterday = Object.entries(sumsYesterday).sort((a, b) => b[1] - a[1])
        const top3Yesterday = sortedYesterday.slice(0, 3).map(([id]) => id)
        const isTopYesterday = sortedYesterday[0]?.[0] === userId
        const isInTop3Yesterday = top3Yesterday.includes(userId)

        // -- Aujourd'hui (exclut isSystem)
        const allToday = await prisma.exerciseSet.findMany({
            where: { date: today, user: { isSystem: false } },
        })
        const sumsToday: Record<string, number> = {}
        for (const s of allToday) {
            sumsToday[s.userId] = (sumsToday[s.userId] ?? 0) + s.reps
        }
        const sortedToday = Object.entries(sumsToday).sort((a, b) => b[1] - a[1])
        const isTopToday = sortedToday[0]?.[0] === userId

        const canPass = isTopYesterday || isInTop3Yesterday || isTopToday
        if (!canPass) {
            const myYesterday = sumsYesterday[userId] ?? 0
            const myToday = sumsToday[userId] ?? 0
            const topYesterdayReps = sortedYesterday[0]?.[1] ?? 0
            return NextResponse.json({
                ok: false,
                reason: `CHAMPIO te toise. "Sois #1 d'hier (toi: ${myYesterday}, le #1: ${topYesterdayReps}), ou top 3 d'hier, ou #1 d'aujourd'hui (toi: ${myToday}). Reviens."`,
            })
        }
        earnedChampioStarBadge = isTopYesterday
    }

    // ============= Marquer comme battu (v3.5 : pour toujours) =============
    const newDefeated = alreadyDefeated.includes(pnjId) ? alreadyDefeated : [...alreadyDefeated, pnjId]
    // bridgePnjLastBeatenDate gardé pour rétrocompat mais n'a plus d'effet
    const existingLastBeaten = (progress.bridgePnjLastBeatenDate as Record<string, string>) ?? {}
    const newLastBeaten = { ...existingLastBeaten, [pnjId]: today }

    await prisma.gamebookProgress.update({
        where: { id: progress.id },
        data: {
            bridgePnjDefeated: newDefeated,
            bridgePnjLastBeatenDate: newLastBeaten,
        },
    })

    // v3.9 — Compteur global de victoires (uniquement pour PNJ exercice ; CHAMPIO n'a pas de seuil)
    if (challenge.kind === "exercise") {
        try {
            await incrementBridgeVictory(pnjId)
        } catch (e) {
            console.warn("[bridge] could not increment victory counter", e)
        }
    }

    // v3.9 — Badge "Star du Pont d'Hier" si CHAMPIO vaincu en tant que #1 de la veille
    let championStarAwarded = false
    if (earnedChampioStarBadge) {
        try {
            // Vérifier que la BadgeDefinition existe (initBadges() la crée au boot)
            const def = await (prisma as { badgeDefinition: { findUnique: (a: unknown) => Promise<unknown> } }).badgeDefinition.findUnique({
                where: { key: BADGE_KEY_CHAMPIO_STAR },
            })
            if (def) {
                const existing = await (prisma as { badgeEvent: { findFirst: (a: unknown) => Promise<unknown> } }).badgeEvent.findFirst({
                    where: {
                        badgeKey: BADGE_KEY_CHAMPIO_STAR,
                        toUserId: userId,
                        eventType: "UNIQUE_AWARDED",
                    },
                })
                if (!existing) {
                    await (prisma as { badgeEvent: { create: (a: unknown) => Promise<unknown> } }).badgeEvent.create({
                        data: {
                            badgeKey: BADGE_KEY_CHAMPIO_STAR,
                            fromUserId: null,
                            toUserId: userId,
                            eventType: "UNIQUE_AWARDED",
                            previousValue: 0,
                            newValue: 1,
                            metadata: JSON.stringify({
                                source: "gamebook_bridge_champio_top1_yesterday",
                                xpReward: XP_REWARD_CHAMPIO_STAR,
                            }),
                        },
                    })
                    championStarAwarded = true
                }
            }
        } catch (e) {
            console.warn("[bridge] could not create CHAMPIO star BadgeEvent", e)
        }

        // XP via XpAdjustment (date obligatoire, idempotence par reason)
        try {
            const existingXp = await (prisma as { xpAdjustment: { findFirst: (a: unknown) => Promise<unknown> } }).xpAdjustment.findFirst({
                where: { userId, reason: "BADGE_CHAMPIO_STAR_GAMEBOOK" },
            })
            if (!existingXp) {
                await (prisma as { xpAdjustment: { create: (a: unknown) => Promise<unknown> } }).xpAdjustment.create({
                    data: {
                        userId,
                        amount: XP_REWARD_CHAMPIO_STAR,
                        reason: "BADGE_CHAMPIO_STAR_GAMEBOOK",
                        date: today,
                    },
                })
            }
        } catch (e) {
            console.warn("[bridge] could not create CHAMPIO star XpAdjustment", e)
        }
    }

    return NextResponse.json({
        ok: true,
        defeated: newDefeated,
        thresholdUsed: thresholdUsed ?? undefined,
        championStarAwarded,
        xp: championStarAwarded ? XP_REWARD_CHAMPIO_STAR : undefined,
    })
}

function labelExercise(ex: string): string {
    if (ex === "PUSHUP") return "pompes"
    if (ex === "SQUAT") return "squats"
    if (ex === "GAINAGE") return "secondes de gainage"
    if (ex === "PULLUP") return "tractions"
    if (ex === "CARDIO") return "cardio"
    return "reps"
}
