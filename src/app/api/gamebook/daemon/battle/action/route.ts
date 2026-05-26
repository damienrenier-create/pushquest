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
    applySwitchEnemyTurn,
    type BattleState,
    type PlayerAction,
    type BattleActor,
} from "@/lib/gamebook/battleState"
import {
    xpForLevel,
    levelFromXp,
    DAEMON_LEVEL_MAX,
    computeMaxHp,
    happinessMultiplier,
    computeCritRate,
    type DaemonType,
    type Morphology,
} from "@/lib/gamebook/daemon"

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

    // ============================================================
    // Phase 2.D — SWITCH géré ici (besoin d'accès DB)
    // ============================================================
    if (body.action.kind === "switch") {
        const targetDaemonId = body.action.daemonId
        if (!targetDaemonId || targetDaemonId === leader.id) {
            return NextResponse.json({ ok: false, reason: "Cible de switch invalide." }, { status: 400 })
        }
        const target = await (prisma as any).daemon.findUnique({ where: { id: targetDaemonId } })
        if (!target || target.userId !== userId) {
            return NextResponse.json({ ok: false, reason: "Daemon cible introuvable." }, { status: 404 })
        }
        if (!target.unlockedAt) {
            return NextResponse.json({ ok: false, reason: `${target.name} n'est pas encore éveillé.` }, { status: 400 })
        }
        if (target.currentHp <= 0) {
            return NextResponse.json({ ok: false, reason: `${target.name} est K.O.` }, { status: 400 })
        }

        // 1. Persiste le HP courant du Daemon sortant
        await (prisma as any).daemon.update({
            where: { id: leader.id },
            data: { currentHp: leader.currentHp },
        })

        // 2. Construit le BattleActor du remplaçant (stats effectives + bonheur)
        const happMult = happinessMultiplier(target.happiness)
        const maxHp = computeMaxHp(target.baseEnd, target.combatLevel, target.bonusEnd)
        const effI = Math.round((target.baseInt + target.bonusInt) * happMult)
        const newPlayer: BattleActor = {
            daemonId: target.id,
            name: target.name,
            type: target.type as DaemonType,
            morphology: target.morphology as Morphology,
            speciesLevel: target.speciesLevel,
            combatLevel: target.combatLevel,
            maxHp,
            currentHp: target.currentHp,
            force: Math.round((target.baseFor + target.bonusFor) * happMult),
            vitesse: Math.round((target.baseVit + target.bonusVit) * happMult),
            defense: Math.round((target.baseDef + target.bonusDef) * happMult),
            intelligence: effI,
            endurance: Math.round((target.baseEnd + target.bonusEnd) * happMult),
            happiness: target.happiness,
            critRate: computeCritRate(effI, target.happiness),
            attacksEquipped: Array.isArray(target.attacksEquipped) ? target.attacksEquipped : ["charge"],
        }

        // 3. Switch + l'ennemi attaque le nouveau leader gratis (coût 1 tour)
        const switchResult = applySwitchEnemyTurn(stateBefore, newPlayer)
        const switchedState = switchResult.state

        // 4. Persiste : HP du nouveau leader + activeBattle
        const newTargetHp = Math.max(0, target.currentHp + switchResult.playerHpDelta)
        await (prisma as any).daemon.update({
            where: { id: target.id },
            data: { currentHp: newTargetHp },
        })

        const switchProgressData: Record<string, unknown> = {}
        if (switchedState.phase === "ended") {
            switchProgressData.activeBattle = null
        } else {
            switchProgressData.activeBattle = switchedState as unknown as object
        }
        await (prisma as any).gamebookProgress.update({
            where: { id: progress.id },
            data: switchProgressData,
        })

        return NextResponse.json({
            ok: true,
            state: switchedState,
            meta: { xpEarned: 0, energySpent: 0, playerHpDelta: switchResult.playerHpDelta,
                playerHappinessDelta: 0, leveledUp: false,
                newCombatLevel: target.combatLevel, nextLevelXp: xpForLevel(target.combatLevel + 1) },
        })
    }

    // ============================================================
    // Autres actions (attack / flee) — transition pure
    // ============================================================
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
