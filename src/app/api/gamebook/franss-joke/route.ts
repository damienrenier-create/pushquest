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

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const FRANSS_USER_ID = "cmpgu4uq5000069du4s19q5l9"
const FRANSS_BONUS_REPS = 30

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

    if ((progress as { franssJokeBirdDone?: boolean }).franssJokeBirdDone === true) {
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

    // Phase 2 : warp vers JOJO + bonus + flag définitif
    const today = getTodayISO()
    const storedDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
    const storedSpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
    const currentSpent = storedDate === today ? storedSpent : 0
    const newSpent = currentSpent - FRANSS_BONUS_REPS

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            mapId: JOJO_SPAWN.mapId,
            posX: JOJO_SPAWN.posX,
            posY: JOJO_SPAWN.posY,
            direction: JOJO_SPAWN.direction,
            franssJokeBirdDone: true,
            energySpentToday: newSpent,
            energySpentDate: today,
            lastSeen: new Date(),
        },
    })

    const todayReps = await getTodayReps(userId)
    const isCreator = await isCreatorAccount(userId)
    const availableEnergy = padAvailableEnergyForCreator(todayReps - newSpent, isCreator)

    return NextResponse.json({
        ok: true,
        step: "warpToJojoAndReward",
        spawn: JOJO_SPAWN,
        reward: FRANSS_BONUS_REPS,
        availableEnergy,
        energySpentToday: newSpent,
    })
}
