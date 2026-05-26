// src/app/api/gamebook/daemon/battle/action/route.ts
//
// v4.0 Phase 2.B — POST : exécute UNE action joueur sur la battle en cours,
// joue automatiquement la riposte ennemie, persiste l'état mis à jour.
//
// Body :
//   { action: { kind: "attack", attackKey: string }
//           | { kind: "flee" }
//           | { kind: "switch", daemonId: string }   // pas encore implémenté
//   }
//
// Effets persistés :
//   - Daemon.currentHp (player) → state.player.currentHp
//   - Daemon.happiness         → -10 si fuite réussie (FLEE_HAPPINESS_COST)
//   - GamebookProgress.energySpentToday += energySpentDelta (coût attaques)
//   - GamebookProgress.activeBattle    = state mis à jour
//
// Si phase=ended :
//   - victoire   → ajoute rewardXp à Daemon.combatXp + tracking saiyan, vide activeBattle
//   - defeat     → set Daemon.currentHp = 0, vide activeBattle (le retour cellule
//                  Pastagone sera géré côté flow narratif Phase 4)
//   - fled       → vide activeBattle, applique le -10 happiness

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import {
    applyPlayerAction,
    type BattleState,
    type PlayerAction,
} from "@/lib/gamebook/battleState"
import { xpForLevel, levelFromXp, DAEMON_LEVEL_MAX } from "@/lib/gamebook/daemon"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { action?: PlayerAction }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    if (!body.action || !body.action.kind) {
        return NextResponse.json({ ok: false, reason: "action requise" }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    if (!progress.activeBattle) {
        return NextResponse.json({ ok: false, reason: "Aucune battle en cours" }, { status: 400 })
    }

    const currentState = progress.activeBattle as unknown as BattleState
    if (currentState.phase === "ended") {
        return NextResponse.json({ ok: false, reason: "Battle déjà terminée", state: currentState }, { status: 400 })
    }

    // Vérifie que le Daemon actif existe toujours et appartient à l'user
    const leader = await (prisma as any).daemon.findUnique({
        where: { id: currentState.playerDaemonId },
    })
    if (!leader || leader.userId !== userId) {
        // État incohérent : on coupe court
        await (prisma as any).gamebookProgress.update({
            where: { id: progress.id }, data: { activeBattle: null },
        })
        return NextResponse.json({ ok: false, reason: "Daemon actif introuvable. Battle annulée." }, { status: 400 })
    }

    // Resync currentHp depuis DB (filet anti-cheat : le client ne peut pas tricher)
    const stateBefore: BattleState = {
        ...currentState,
        player: { ...currentState.player, currentHp: leader.currentHp },
    }

    const result = applyPlayerAction(stateBefore, body.action)
    const newState = result.state

    // ============================================================
    // Persistance
    // ============================================================
    const newHp = Math.max(0, leader.currentHp + result.playerHpDelta)
    const playerData: Record<string, unknown> = { currentHp: newHp }
    if (result.playerHappinessDelta !== 0) {
        playerData.happiness = Math.max(0, Math.min(100, leader.happiness + result.playerHappinessDelta))
    }

    // Tracking Saiyan : énergie consommée + KO
    const newEnergyThisLevel = (leader.energySpentThisLevel ?? 0) + result.energySpentDelta
    playerData.energySpentThisLevel = newEnergyThisLevel

    // Si on a gagné de l'XP : ajoute + check level up
    let leveledUp = false
    let newCombatLevel = leader.combatLevel
    if (result.xpEarned > 0) {
        const newXp = (leader.combatXp ?? 0) + result.xpEarned
        playerData.combatXp = newXp
        newCombatLevel = Math.min(DAEMON_LEVEL_MAX, levelFromXp(newXp))
        if (newCombatLevel > leader.combatLevel) {
            playerData.combatLevel = newCombatLevel
            leveledUp = true
        }
        playerData.battlesTotal = (leader.battlesTotal ?? 0) + 1
    } else if (newState.phase === "ended" && newState.result === "defeat") {
        playerData.koCountThisLevel = (leader.koCountThisLevel ?? 0) + 1
        playerData.lastKoAt = new Date()
    }

    await (prisma as any).daemon.update({
        where: { id: leader.id },
        data: playerData,
    })

    // Énergie consommée → ajoute à energySpentToday
    const progressData: Record<string, unknown> = {}
    if (result.energySpentDelta > 0) {
        progressData.energySpentToday = (progress.energySpentToday ?? 0) + result.energySpentDelta
        progressData.energySpentDate = new Date().toISOString().slice(0, 10)
    }

    // ActiveBattle : null si phase=ended, sinon état mis à jour
    if (newState.phase === "ended") {
        progressData.activeBattle = null
    } else {
        progressData.activeBattle = newState as unknown as object
    }
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: progressData,
    })

    return NextResponse.json({
        ok: true,
        state: newState,
        meta: {
            xpEarned: result.xpEarned,
            energySpent: result.energySpentDelta,
            playerHpDelta: result.playerHpDelta,
            playerHappinessDelta: result.playerHappinessDelta,
            leveledUp,
            newCombatLevel,
            nextLevelXp: xpForLevel(Math.min(DAEMON_LEVEL_MAX, newCombatLevel + 1)),
        },
    })
}
