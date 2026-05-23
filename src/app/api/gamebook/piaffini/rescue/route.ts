// src/app/api/gamebook/piaffini/rescue/route.ts
//
// v3.11 — POST : déclenche le sauvetage de PIAFFINI.
//
// Appelé par MapClient à la fin de la cinématique de vol (après que le joueur
// ait validé tous les dialogues PIAFFINI au sommet de la Tour).
//
// Effet idempotent :
//   - Marque piaffiniRescued = true
//   - Crée le BadgeEvent UNIQUE_AWARDED + XpAdjustment (200 XP) — pattern Pionnier
//   - Ajoute le Set de Nage à l'inventory
//   - Téléporte le joueur à Bourg-Boulette case fixe (8, 10) — sur le chemin central
//
// Si piaffiniRescued est déjà true, on no-op silencieusement (re-déclenchement OK).
// Bypass anti-cheat : pas de check frozen (la cinématique est narrative, pas exploitable).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { parseInventory, addItem, hasIntactItem } from "@/lib/gamebook/inventory"
import { getInitialItemData, getItem } from "@/lib/gamebook/items"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const BADGE_KEY_SAUVEUR_PIAFFINI = "gamebook_sauveur_piaffini"
const XP_REWARD_SAUVEUR_PIAFFINI = 200
const SWIM_SET_KEY = "swim_set"

// Position de téléport à Bourg-Boulette après la cinématique (chemin central, hors hautes herbes)
const PIAFFINI_LANDING = { mapId: "bourgpates", posX: 8, posY: 10, direction: "down" as const }

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

    // Idempotence : si déjà sauvé, on no-op
    if ((progress as { piaffiniRescued?: boolean }).piaffiniRescued === true) {
        return NextResponse.json({
            ok: true,
            alreadyRescued: true,
            spawn: PIAFFINI_LANDING,
        })
    }

    // ============= Ajouter le Set de Nage à l'inventaire =============
    const currentInventory = parseInventory(progress.inventory)
    let newInventory = currentInventory
    const swimSetDef = getItem(SWIM_SET_KEY)
    if (swimSetDef && !hasIntactItem(currentInventory, SWIM_SET_KEY)) {
        newInventory = addItem(currentInventory, SWIM_SET_KEY, getInitialItemData(swimSetDef))
    }

    // ============= Update progress (état flag + téléport + inventory) =============
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            piaffiniRescued: true,
            mapId: PIAFFINI_LANDING.mapId,
            posX: PIAFFINI_LANDING.posX,
            posY: PIAFFINI_LANDING.posY,
            direction: PIAFFINI_LANDING.direction,
            inventory: newInventory,
            lastSeen: new Date(),
        },
    })

    // ============= Créer le BadgeEvent UNIQUE_AWARDED (pattern Pionnier) =============
    // On vérifie que la BadgeDefinition existe en DB (créée par initBadges au boot serveur)
    let badgeAwarded = false
    try {
        const def = await (prisma as { badgeDefinition: { findUnique: (a: unknown) => Promise<unknown> } }).badgeDefinition.findUnique({
            where: { key: BADGE_KEY_SAUVEUR_PIAFFINI },
        })
        if (def) {
            const existing = await (prisma as { badgeEvent: { findFirst: (a: unknown) => Promise<unknown> } }).badgeEvent.findFirst({
                where: {
                    badgeKey: BADGE_KEY_SAUVEUR_PIAFFINI,
                    toUserId: userId,
                    eventType: "UNIQUE_AWARDED",
                },
            })
            if (!existing) {
                await (prisma as { badgeEvent: { create: (a: unknown) => Promise<unknown> } }).badgeEvent.create({
                    data: {
                        badgeKey: BADGE_KEY_SAUVEUR_PIAFFINI,
                        fromUserId: null,
                        toUserId: userId,
                        eventType: "UNIQUE_AWARDED",
                        previousValue: 0,
                        newValue: 1,
                        metadata: JSON.stringify({
                            source: "gamebook_tower_top_piaffini",
                            xpReward: XP_REWARD_SAUVEUR_PIAFFINI,
                        }),
                    },
                })
                badgeAwarded = true
            }
        }
    } catch (e) {
        console.warn("[piaffini/rescue] could not create BadgeEvent", e)
    }

    // ============= Créer l'XpAdjustment (200 XP) =============
    try {
        const today = getTodayISO()
        const existingXp = await (prisma as { xpAdjustment: { findFirst: (a: unknown) => Promise<unknown> } }).xpAdjustment.findFirst({
            where: { userId, reason: "BADGE_SAUVEUR_PIAFFINI_GAMEBOOK" },
        })
        if (!existingXp) {
            await (prisma as { xpAdjustment: { create: (a: unknown) => Promise<unknown> } }).xpAdjustment.create({
                data: {
                    userId,
                    amount: XP_REWARD_SAUVEUR_PIAFFINI,
                    reason: "BADGE_SAUVEUR_PIAFFINI_GAMEBOOK",
                    date: today,
                },
            })
        }
    } catch (e) {
        console.warn("[piaffini/rescue] could not create XpAdjustment", e)
    }

    return NextResponse.json({
        ok: true,
        alreadyRescued: false,
        spawn: PIAFFINI_LANDING,
        inventory: newInventory,
        badgeAwarded,
        xp: XP_REWARD_SAUVEUR_PIAFFINI,
        itemReceived: SWIM_SET_KEY,
    })
}
