// src/app/api/gamebook/tamagotchi/liberer/route.ts
//
// v3.19 — POST : "récupérer" / "libérer" l'animal après les 7 défis.
// Pré-requis :
//   - Adopté
//   - 7/7 défis complétés
//   - !recovered
//   - Sur la map "veterinaire" (V3T)
//
// Effet :
//   - tamagotchi.recovered = true + recoveredAt = now
//   - Badge "Animal Totem" UNIQUE_AWARDED + XpAdjustment 100 XP (pattern Pionnier / Sauveur PIAFFINI)

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isGamebookFrozen } from "@/lib/gamebook/antiCheat"
import { parseTamagotchi, viewTamagotchi, countDefisDone, CANONICAL_DEFIS } from "@/lib/gamebook/tamagotchi"
import { getUserLevelForGamebook } from "@/lib/gamebook/userLevel"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const BADGE_KEY_ANIMAL_TOTEM = "gamebook_animal_totem"
const XP_REWARD_ANIMAL_TOTEM = 100

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
    if (isGamebookFrozen(progress as { gamebookFrozenUntil?: Date | null })) {
        return NextResponse.json({ ok: false, reason: "Gamebook gelé.", frozen: true })
    }
    if (progress.mapId !== "veterinaire") {
        return NextResponse.json({ ok: false, reason: "Tu n'es pas chez le vétérinaire." })
    }

    const tam = parseTamagotchi(progress.tamagotchi)
    if (!tam) {
        return NextResponse.json({ ok: false, reason: "Pas de tamagotchi adopté." })
    }
    if (tam.recovered === true) {
        return NextResponse.json({ ok: false, reason: "Ton animal est déjà parti avec toi." })
    }
    const done = countDefisDone(tam)
    if (done < CANONICAL_DEFIS.length) {
        return NextResponse.json({
            ok: false,
            reason: `Il te reste des défis (${CANONICAL_DEFIS.length - done} non validés). Reviens quand c'est fait.`,
        })
    }

    const now = new Date()
    const updatedTam = {
        ...tam,
        recovered: true,
        recoveredAt: now.toISOString(),
    }
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            tamagotchi: updatedTam,
            lastSeen: now,
        },
    })

    // Badge "Animal Totem" : UNIQUE_AWARDED (pattern Pionnier)
    let badgeAwarded = false
    try {
        const def = await (prisma as { badgeDefinition: { findUnique: (a: unknown) => Promise<unknown> } }).badgeDefinition.findUnique({
            where: { key: BADGE_KEY_ANIMAL_TOTEM },
        })
        if (def) {
            const existing = await (prisma as { badgeEvent: { findFirst: (a: unknown) => Promise<unknown> } }).badgeEvent.findFirst({
                where: {
                    badgeKey: BADGE_KEY_ANIMAL_TOTEM,
                    toUserId: userId,
                    eventType: "UNIQUE_AWARDED",
                },
            })
            if (!existing) {
                await (prisma as { badgeEvent: { create: (a: unknown) => Promise<unknown> } }).badgeEvent.create({
                    data: {
                        badgeKey: BADGE_KEY_ANIMAL_TOTEM,
                        fromUserId: null,
                        toUserId: userId,
                        eventType: "UNIQUE_AWARDED",
                        previousValue: 0,
                        newValue: 1,
                        metadata: JSON.stringify({
                            source: "gamebook_animal_totem_recovered",
                            animalLevel: tam.currentLevel,
                            animalName: tam.name,
                            xpReward: XP_REWARD_ANIMAL_TOTEM,
                        }),
                    },
                })
                badgeAwarded = true
            }
        }
    } catch (e) {
        console.warn("[tamagotchi/liberer] could not create BadgeEvent", e)
    }

    // XpAdjustment +100 XP idempotent par reason
    try {
        const today = getTodayISO()
        const existingXp = await (prisma as { xpAdjustment: { findFirst: (a: unknown) => Promise<unknown> } }).xpAdjustment.findFirst({
            where: { userId, reason: "BADGE_ANIMAL_TOTEM_GAMEBOOK" },
        })
        if (!existingXp) {
            await (prisma as { xpAdjustment: { create: (a: unknown) => Promise<unknown> } }).xpAdjustment.create({
                data: {
                    userId,
                    amount: XP_REWARD_ANIMAL_TOTEM,
                    reason: "BADGE_ANIMAL_TOTEM_GAMEBOOK",
                    date: today,
                },
            })
        }
    } catch (e) {
        console.warn("[tamagotchi/liberer] could not create XpAdjustment", e)
    }

    const userLevel = await getUserLevelForGamebook(userId)
    const view = viewTamagotchi(updatedTam, userLevel)
    return NextResponse.json({
        ok: true,
        tamagotchi: view,
        badgeAwarded,
        xp: XP_REWARD_ANIMAL_TOTEM,
    })
}
