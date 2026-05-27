// src/app/api/gamebook/mont/summit-reached/route.ts
//
// v3.23c — POST : le joueur a atteint le sommet du Mont Pasta-Ventoux (y=1).
// Idempotent via montSummitReached. Récompense : badge Conquérant 200 XP (cap v4.0).
//
// Le client appelle cette route quand le sprite arrive sur y=1 du
// mont_pasta_ventoux. Pas de coût en reps (le coût est dans la montée elle-même).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const BADGE_KEY_CONQUERANT = "gamebook_conquerant"
const XP_REWARD_CONQUERANT = 200  // v4.0 — cap badges Nexus à 200 XP max (était 500)

export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }

    const alreadyReached = (progress as { montSummitReached?: boolean }).montSummitReached === true
    if (alreadyReached) {
        return NextResponse.json({
            ok: true,
            alreadyReached: true,
        })
    }

    // Marquer le flag
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            montSummitReached: true,
            lastSeen: new Date(),
        },
    })

    // Badge Conquérant
    let badgeAwarded = false
    try {
        const def = await (prisma as any).badgeDefinition.findUnique({
            where: { key: BADGE_KEY_CONQUERANT },
        })
        if (def) {
            const existing = await (prisma as any).badgeEvent.findFirst({
                where: {
                    badgeKey: BADGE_KEY_CONQUERANT,
                    toUserId: userId,
                    eventType: "UNIQUE_AWARDED",
                },
            })
            if (!existing) {
                await (prisma as any).badgeEvent.create({
                    data: {
                        badgeKey: BADGE_KEY_CONQUERANT,
                        fromUserId: null,
                        toUserId: userId,
                        eventType: "UNIQUE_AWARDED",
                        previousValue: 0,
                        newValue: 1,
                        metadata: JSON.stringify({
                            source: "gamebook_mont_summit",
                            xpReward: XP_REWARD_CONQUERANT,
                        }),
                    },
                })
                badgeAwarded = true
            }
        }
    } catch (e) {
        console.warn("[mont/summit-reached] could not create badge event", e)
    }

    // XP
    try {
        const today = getTodayISO()
        const existingXp = await (prisma as any).xpAdjustment.findFirst({
            where: { userId, reason: "BADGE_CONQUERANT_GAMEBOOK" },
        })
        if (!existingXp) {
            await (prisma as any).xpAdjustment.create({
                data: {
                    userId,
                    amount: XP_REWARD_CONQUERANT,
                    reason: "BADGE_CONQUERANT_GAMEBOOK",
                    date: today,
                },
            })
        }
    } catch (e) {
        console.warn("[mont/summit-reached] could not create XpAdjustment", e)
    }

    return NextResponse.json({
        ok: true,
        alreadyReached: false,
        badgeAwarded,
        xp: XP_REWARD_CONQUERANT,
        badgeKey: BADGE_KEY_CONQUERANT,
    })
}
