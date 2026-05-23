// src/app/api/gamebook/water/push/route.ts
//
// v3.12 — POST : pousser un joueur dans le canal de Macaron'île.
// Payload : { targetUserId: string }
//
// Logique :
//   - Le pousseur (B = session.user) reste sur sa berge (Bourg-Boulette)
//   - Le poussé (A = targetUserId) doit :
//       * avoir le swim_set dans son inventaire (sinon refus narratif)
//       * NE PAS avoir firstSwimDone (sinon push inutile, refus)
//       * être actuellement sur bourgpates face à waterShallow (online OU offline,
//         on lit sa dernière position en DB)
//   - Si tout OK :
//       * A est téléporté à macaron_ile (7, 1) — 1ère case du canal nord
//       * A.firstSwimDone = true
//       * B reçoit +100 EmberCoins (CoinAdjustment)
//       * B reçoit le badge "Pousseur de potes" 100 XP (idempotent, 1 fois max via existence check)
//
// Anti-cheat : pas de vérification de position du pousseur (B), c'est asynchrone par design.
// Sartay a validé : "on peut se faire pousser à l'eau en étant hors ligne". B peut donc
// pousser A même si A est offline (on utilise la dernière position connue de A).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { parseInventory, hasIntactItem } from "@/lib/gamebook/inventory"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const BADGE_KEY_POUSSEUR = "gamebook_pousseur_potes"
const XP_REWARD_POUSSEUR = 100
const EC_REWARD_POUSSEUR = 100
const SWIM_SET_KEY = "swim_set"

// Position de spawn quand A est poussé (1ère case nord du canal de Macaron'île)
const CANAL_NORTH_SPAWN = { mapId: "macaron_ile", posX: 7, posY: 1, direction: "down" as const }

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const pusherUserId = (session.user as { id: string }).id

    let body: Record<string, unknown>
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId : null
    if (!targetUserId) {
        return NextResponse.json({ ok: false, reason: "targetUserId requis." }, { status: 400 })
    }
    if (targetUserId === pusherUserId) {
        return NextResponse.json({ ok: false, reason: "Tu ne peux pas te pousser toi-même." }, { status: 400 })
    }

    // Récupérer le progress du poussé (A)
    const targetProgress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId: targetUserId, chapterId: CHAPTER_ID } },
    })
    if (!targetProgress) {
        return NextResponse.json({ ok: false, reason: "Cible introuvable dans le Gamebook." }, { status: 400 })
    }

    // Check : la cible doit avoir swim_set
    const targetInventory = parseInventory(targetProgress.inventory)
    if (!hasIntactItem(targetInventory, SWIM_SET_KEY)) {
        return NextResponse.json({
            ok: false,
            reason: "Ta cible n'a pas l'équipement de nage. Tu ne peux pas le pousser dans l'eau.",
        })
    }

    // v3.17 — Q27 : suppression du blocage "déjà firstSwimDone".
    // Désormais on peut pousser ses potes autant de fois qu'on veut, tant qu'ils
    // sont à Bourg-Boulette avec leur swim_set. Push reste atomique : téléport canal nord à chaque fois.

    // Check : la cible doit être actuellement sur bourgpates (sinon ce n'est pas
    // près du canal de Bourg-Boulette). On accepte n'importe quelle position
    // de bourgpates pour simplifier (les détails de proximité au canal sont gérés
    // côté client : c'est le client B qui décide quand déclencher le push).
    if (targetProgress.mapId !== "bourgpates") {
        return NextResponse.json({
            ok: false,
            reason: "Ta cible n'est pas à Bourg-Boulette.",
        })
    }

    // ============= Effectuer le push =============
    // 1. Modifier la cible (A) : firstSwimDone + téléport au canal nord
    await (prisma as any).gamebookProgress.update({
        where: { id: targetProgress.id },
        data: {
            firstSwimDone: true,
            mapId: CANAL_NORTH_SPAWN.mapId,
            posX: CANAL_NORTH_SPAWN.posX,
            posY: CANAL_NORTH_SPAWN.posY,
            direction: CANAL_NORTH_SPAWN.direction,
            lastSeen: new Date(),
        },
    })

    // 2. Récompenser le pousseur (B) : 100 EmberCoins via CoinAdjustment
    const today = getTodayISO()
    try {
        await (prisma as any).coinAdjustment.create({
            data: {
                userId: pusherUserId,
                amount: EC_REWARD_POUSSEUR,
                reason: "GAMEBOOK_PUSH_TO_WATER",
                refId: targetUserId,
                date: today,
            },
        })
    } catch (e) {
        console.warn("[water/push] could not create CoinAdjustment", e)
    }

    // 3. Badge "Pousseur de potes" pour le pousseur (idempotent : 1 fois max)
    let badgeAwarded = false
    try {
        const def = await (prisma as { badgeDefinition: { findUnique: (a: unknown) => Promise<unknown> } }).badgeDefinition.findUnique({
            where: { key: BADGE_KEY_POUSSEUR },
        })
        if (def) {
            const existing = await (prisma as { badgeEvent: { findFirst: (a: unknown) => Promise<unknown> } }).badgeEvent.findFirst({
                where: {
                    badgeKey: BADGE_KEY_POUSSEUR,
                    toUserId: pusherUserId,
                    eventType: "UNIQUE_AWARDED",
                },
            })
            if (!existing) {
                await (prisma as { badgeEvent: { create: (a: unknown) => Promise<unknown> } }).badgeEvent.create({
                    data: {
                        badgeKey: BADGE_KEY_POUSSEUR,
                        fromUserId: null,
                        toUserId: pusherUserId,
                        eventType: "UNIQUE_AWARDED",
                        previousValue: 0,
                        newValue: 1,
                        metadata: JSON.stringify({
                            source: "gamebook_water_push",
                            firstPushed: targetUserId,
                            xpReward: XP_REWARD_POUSSEUR,
                        }),
                    },
                })
                badgeAwarded = true

                // XP via XpAdjustment (idempotent par reason)
                try {
                    await (prisma as { xpAdjustment: { create: (a: unknown) => Promise<unknown> } }).xpAdjustment.create({
                        data: {
                            userId: pusherUserId,
                            amount: XP_REWARD_POUSSEUR,
                            reason: "BADGE_POUSSEUR_POTES_GAMEBOOK",
                            date: today,
                        },
                    })
                } catch (e) {
                    console.warn("[water/push] could not create XpAdjustment", e)
                }
            }
        }
    } catch (e) {
        console.warn("[water/push] could not create BadgeEvent", e)
    }

    return NextResponse.json({
        ok: true,
        targetUserId,
        ecAwarded: EC_REWARD_POUSSEUR,
        badgeAwarded,
        xp: badgeAwarded ? XP_REWARD_POUSSEUR : 0,
    })
}
