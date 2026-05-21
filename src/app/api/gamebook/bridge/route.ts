// src/app/api/gamebook/bridge/route.ts
//
// API du défi du Pont Pépite d'Azuria.
//
// POST /api/gamebook/bridge
//   body: { action: "challengePnj" | "claimPioneerBadge", pnjId?: string }
//
//   "challengePnj" : tente de battre un PNJ (vérifie les conditions, marque comme battu)
//   "claimPioneerBadge" : donne le badge Pionnier (200 XP) si pas déjà fait
//
// La logique anti-triche est côté serveur : on relit les vraies données
// depuis prisma.exerciseSet avant de valider.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO, getYesterdayISO } from "@/lib/challenge"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

// PNJ et leurs défis (doit matcher BRIDGE_PNJS dans maps.ts)
type BridgeChallenge =
    | { kind: "exercise"; exercise: "PUSHUP" | "SQUAT" | "GAINAGE" | "PULLUP" | "CARDIO"; reps: number }
    | { kind: "topYesterday" }

const BRIDGE_PNJS_SERVER: Record<string, BridgeChallenge> = {
    pnj_pompo:   { kind: "exercise", exercise: "PUSHUP",  reps: 100 },
    pnj_squatto: { kind: "exercise", exercise: "SQUAT",   reps: 100 },
    pnj_gainax:  { kind: "exercise", exercise: "GAINAGE", reps: 100 },
    pnj_champio: { kind: "topYesterday" },
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

    // Marquer comme attribué
    await prisma.gamebookProgress.update({
        where: { id: progress.id },
        data: { pioneerBadgeAwarded: true },
    })

    // Ajouter le badge si la BadgeDefinition existe
    try {
        const badgeDef = await (prisma as { badgeDefinition: { findFirst: (a: unknown) => Promise<unknown> } }).badgeDefinition.findFirst({
            where: { id: "pionnier_pushquest" },
        })
        if (badgeDef) {
            await (prisma as { badgeOwnership: { create: (a: unknown) => Promise<unknown> } }).badgeOwnership.create({
                data: { userId, badgeId: "pionnier_pushquest" },
            })
        }
    } catch (e) {
        console.warn("[bridge] could not create badge ownership", e)
    }

    // XP via XpAdjustment (pattern existant dans l'app)
    try {
        await (prisma as { xpAdjustment: { create: (a: unknown) => Promise<unknown> } }).xpAdjustment.create({
            data: {
                userId,
                amount: 200,
                reason: "BADGE_PIONNIER_GAMEBOOK",
            },
        })
    } catch (e) {
        console.warn("[bridge] could not create xp adjustment", e)
    }

    return NextResponse.json({ ok: true, awarded: true, xp: 200 })
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

    const today = getTodayISO()
    const lastBeaten = (progress.bridgePnjLastBeatenDate as Record<string, string>) ?? {}
    if (lastBeaten[pnjId] === today) {
        return NextResponse.json({
            ok: false,
            reason: "Tu as déjà battu ce PNJ aujourd'hui. Reviens demain.",
        })
    }

    // ============= Validation de la condition =============
    if (challenge.kind === "exercise") {
        const sets = await prisma.exerciseSet.findMany({
            where: { userId, date: today, exercise: challenge.exercise },
        })
        const total = sets.reduce((sum: number, s: { reps: number }) => sum + s.reps, 0)
        if (total < challenge.reps) {
            return NextResponse.json({
                ok: false,
                reason: `Il faut ${challenge.reps} ${labelExercise(challenge.exercise)} aujourd'hui. T'en as ${total}.`,
                required: challenge.reps,
                current: total,
            })
        }
    } else if (challenge.kind === "topYesterday") {
        const yesterday = getYesterdayISO()
        const allYesterday = await prisma.exerciseSet.findMany({
            where: { date: yesterday },
        })
        const sumsByUser: Record<string, number> = {}
        for (const s of allYesterday) {
            sumsByUser[s.userId] = (sumsByUser[s.userId] ?? 0) + s.reps
        }
        const sorted = Object.entries(sumsByUser).sort((a, b) => b[1] - a[1])
        const topUserId = sorted[0]?.[0]
        if (!topUserId) {
            return NextResponse.json({
                ok: false,
                reason: "Personne n'a fait de reps hier. CHAMPIO te toise sans bouger.",
            })
        }
        if (topUserId !== userId) {
            const myReps = sumsByUser[userId] ?? 0
            const topReps = sorted[0][1]
            return NextResponse.json({
                ok: false,
                reason: `CHAMPIO ne combat que le #1 de la veille. Toi : ${myReps} reps hier. Le #1 : ${topReps} reps. Reviens.`,
            })
        }
    }

    // ============= Marquer comme battu =============
    const defeated = Array.isArray(progress.bridgePnjDefeated)
        ? (progress.bridgePnjDefeated as string[])
        : []
    const newDefeated = defeated.includes(pnjId) ? defeated : [...defeated, pnjId]
    const newLastBeaten = { ...lastBeaten, [pnjId]: today }

    await prisma.gamebookProgress.update({
        where: { id: progress.id },
        data: {
            bridgePnjDefeated: newDefeated,
            bridgePnjLastBeatenDate: newLastBeaten,
        },
    })

    return NextResponse.json({ ok: true, defeated: newDefeated })
}

function labelExercise(ex: string): string {
    if (ex === "PUSHUP") return "pompes"
    if (ex === "SQUAT") return "squats"
    if (ex === "GAINAGE") return "secondes de gainage"
    if (ex === "PULLUP") return "tractions"
    if (ex === "CARDIO") return "cardio"
    return "reps"
}
