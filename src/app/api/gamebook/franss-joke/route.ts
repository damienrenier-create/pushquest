// src/app/api/gamebook/franss-joke/route.ts
//
// v3.23e — Blague unique de PIAFFINI pour Franss.
//
// Body : { step: "warpToTower" | "warpToJojoAndReward" }
//
// Sécurité :
//   - Seul l'utilisateur Franss (userId hardcodé) est autorisé
//   - Refusé si franssJokeBirdDone === true (one-shot à vie)
//
// Étapes :
//   1. warpToTower            → téléporte server-side vers tower_floor_5 (sommet)
//   2. warpToJojoAndReward    → téléporte vers JOJO à Bourg-Boulette
//                               + crédite 30 reps (energySpentToday -= 30)
//                               + set franssJokeBirdDone = true (one-shot)

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isCreatorAccount, padAvailableEnergyForCreator } from "@/lib/gamebook/creator"
import { getUserDifficultyRatio, applyRatioToReward } from "@/lib/gamebook/ratio"
import { parseInventory, addItem, hasIntactItem } from "@/lib/gamebook/inventory"
import { getInitialItemData, getItem } from "@/lib/gamebook/items"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const FRANSS_USER_ID = "cmpgu4uq5000069du4s19q5l9"
const FRANSS_BONUS_REPS = 30
// v3.23e — La blague est aussi un rescue PIAFFINI (Franss aurait dû le faire normalement).
// JOJO doit reconnaître Franss → on set piaffiniRescued + Set de Nage + badge comme rescue normal.
const BADGE_KEY_SAUVEUR_PIAFFINI = "gamebook_sauveur_piaffini"
const XP_REWARD_SAUVEUR_PIAFFINI = 200
const SWIM_SET_KEY = "swim_set"

// Position au sommet de la Tour (tower_floor_5) : centrée, près de PIAFFINI mais
// laisse la place de bouger. Le sommet est 7×7, milieu = (3, 3).
const TOWER_SUMMIT = { mapId: "tower_floor_5", posX: 3, posY: 4, direction: "up" as const }

// Position chez JOJO à Bourg-Boulette (chemin central, alignée avec la position
// post-cinematic PIAFFINI utilisée par /api/gamebook/piaffini/rescue).
const JOJO_SPAWN = { mapId: "bourgpates", posX: 8, posY: 10, direction: "down" as const }

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

    if (userId !== FRANSS_USER_ID) {
        return NextResponse.json({ ok: false, reason: "Franss only." }, { status: 403 })
    }

    let body: Record<string, unknown>
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    const step = body.step
    if (step !== "warpToTower" && step !== "warpToJojoAndReward") {
        return NextResponse.json({ ok: false, reason: "step invalide." }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }

    // v3.23e — Si la blague a été jouée mais que piaffiniRescued n'a pas été propagé
    // (cas de Franss en prod le jour de la sortie : la route ne faisait pas le rescue),
    // on permet de rejouer la phase 2 pour rattraper. Sinon, no-op.
    const alreadyJoked = (progress as { franssJokeBirdDone?: boolean }).franssJokeBirdDone === true
    const alreadyRescuedFlag = (progress as { piaffiniRescued?: boolean }).piaffiniRescued === true
    if (alreadyJoked && alreadyRescuedFlag) {
        return NextResponse.json({
            ok: false,
            alreadyDone: true,
            reason: "La blague de PIAFFINI a déjà été jouée.",
        })
    }

    if (step === "warpToTower") {
        // Téléport server-side vers le sommet de la Tour. Pas de set du flag final
        // ici — c'est la phase 2 qui le finalise.
        await (prisma as any).gamebookProgress.update({
            where: { id: progress.id },
            data: {
                mapId: TOWER_SUMMIT.mapId,
                posX: TOWER_SUMMIT.posX,
                posY: TOWER_SUMMIT.posY,
                direction: TOWER_SUMMIT.direction,
                lastSeen: new Date(),
            },
        })
        return NextResponse.json({
            ok: true,
            step: "warpToTower",
            spawn: TOWER_SUMMIT,
        })
    }

    // Phase 2 : warp vers JOJO + bonus (si pas déjà joué) + rescue PIAFFINI
    const today = getTodayISO()
    // v3.23e — ratio appliqué au reward (doctrine A1). Si la blague a déjà été jouée,
    // on ne redonne PAS les +30 reps (pas de double crédit, juste rescue rétroactif).
    const ratio = await getUserDifficultyRatio(userId)
    const reward = alreadyJoked ? 0 : applyRatioToReward(FRANSS_BONUS_REPS, ratio)

    // v3.23f — Modèle bonusSurplus
    const { readEnergySnapshot, grantRewardOnSnapshot, computeAvailableEnergy } = await import("@/lib/gamebook/energy")
    const snap = readEnergySnapshot(progress, today)
    const nextSnap = grantRewardOnSnapshot(snap, reward, today)

    // v3.23e — La blague EST aussi un rescue PIAFFINI (sinon JOJO ne reconnaît pas Franss
    // et le dialogue post-piaffini ne s'affiche jamais). On set le flag, on ajoute le
    // Set de Nage, et on crée le badge Sauveur de PIAFFINI comme le rescue normal.
    const alreadyRescued = alreadyRescuedFlag
    const currentInventory = parseInventory((progress as { inventory?: unknown }).inventory)
    let newInventory = currentInventory
    if (!alreadyRescued) {
        const swimSetDef = getItem(SWIM_SET_KEY)
        if (swimSetDef && !hasIntactItem(currentInventory, SWIM_SET_KEY)) {
            newInventory = addItem(currentInventory, SWIM_SET_KEY, getInitialItemData(swimSetDef))
        }
    }

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            mapId: JOJO_SPAWN.mapId,
            posX: JOJO_SPAWN.posX,
            posY: JOJO_SPAWN.posY,
            direction: JOJO_SPAWN.direction,
            franssJokeBirdDone: true,
            // v3.23e — synchronise l'arc PIAFFINI dans la même transaction
            piaffiniRescued: true,
            inventory: newInventory,
            energySpentToday: nextSnap.energySpentToday,
            energySpentDate: nextSnap.energySpentDate,
            bonusSurplus: nextSnap.bonusSurplus,
            lastSeen: new Date(),
        },
    })

    // v3.23e — Crée le badge Sauveur de PIAFFINI (idempotent par UNIQUE_AWARDED + reason)
    if (!alreadyRescued) {
        try {
            const def = await (prisma as any).badgeDefinition.findUnique({
                where: { key: BADGE_KEY_SAUVEUR_PIAFFINI },
            })
            if (def) {
                const existing = await (prisma as any).badgeEvent.findFirst({
                    where: {
                        badgeKey: BADGE_KEY_SAUVEUR_PIAFFINI,
                        toUserId: userId,
                        eventType: "UNIQUE_AWARDED",
                    },
                })
                if (!existing) {
                    await (prisma as any).badgeEvent.create({
                        data: {
                            badgeKey: BADGE_KEY_SAUVEUR_PIAFFINI,
                            fromUserId: null,
                            toUserId: userId,
                            eventType: "UNIQUE_AWARDED",
                            previousValue: 0,
                            newValue: 1,
                            metadata: JSON.stringify({
                                source: "franss_joke_bypass_rescue",
                                xpReward: XP_REWARD_SAUVEUR_PIAFFINI,
                            }),
                        },
                    })
                }
            }
            const existingXp = await (prisma as any).xpAdjustment.findFirst({
                where: { userId, reason: "BADGE_SAUVEUR_PIAFFINI_GAMEBOOK" },
            })
            if (!existingXp) {
                await (prisma as any).xpAdjustment.create({
                    data: {
                        userId,
                        amount: XP_REWARD_SAUVEUR_PIAFFINI,
                        reason: "BADGE_SAUVEUR_PIAFFINI_GAMEBOOK",
                        date: today,
                    },
                })
            }
        } catch (e) {
            console.warn("[franss-joke] could not award PIAFFINI badge", e)
        }
    }

    const todayReps = await getTodayReps(userId)
    const isCreator = await isCreatorAccount(userId)
    const availableEnergy = padAvailableEnergyForCreator(computeAvailableEnergy(todayReps, nextSnap), isCreator)

    return NextResponse.json({
        ok: true,
        step: "warpToJojoAndReward",
        spawn: JOJO_SPAWN,
        reward,
        availableEnergy,
        energySpentToday: nextSnap.energySpentToday,
        bonusSurplus: nextSnap.bonusSurplus,
        // v3.23e — sync inventaire côté client (Set de Nage ajouté)
        inventory: newInventory,
        piaffiniRescued: true,
        rescuedViaJoke: !alreadyRescued,
    })
}
