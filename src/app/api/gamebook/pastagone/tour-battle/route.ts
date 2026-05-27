// src/app/api/gamebook/pastagone/tour-battle/route.ts
//
// v4.0 Phase 6 — POST : lance un combat contre le PNJ courant de la Tour de Garde.
//
// 1. Vérifie pastagoneEscaped===true + cooldown 30s expiré.
// 2. Pose pastagoneTourCooldownUntil = now + 30s.
// 3. Délègue à /api/gamebook/daemon/battle/start (interne — POST direct DB).
//
// Body : aucun (le PNJ courant est lu via pastagoneTourLastNpc).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { findTourNpcById, pickTourNpcRandom } from "@/lib/gamebook/pastagoneTourNpcs"
import {
    computeMaxHp,
    happinessMultiplier,
    computeCritRate,
    computeRewardXp,
    BASE_EXP_TOUR_STANDARD,
    type DaemonType,
    type Morphology,
} from "@/lib/gamebook/daemon"
import type { BattleActor, BattleEnemy, BattleState } from "@/lib/gamebook/battleState"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const COOLDOWN_MS = 30 * 1000

export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    if (progress.pastagoneEscaped !== true) {
        return NextResponse.json({ ok: false, reason: "Pas encore évadé." }, { status: 403 })
    }
    if (progress.activeBattle) {
        return NextResponse.json({ ok: false, reason: "Une battle est déjà en cours." }, { status: 409 })
    }

    // Cooldown
    const now = Date.now()
    const cooldownUntil = progress.pastagoneTourCooldownUntil
        ? new Date(progress.pastagoneTourCooldownUntil).getTime()
        : 0
    if (cooldownUntil > now) {
        const secLeft = Math.ceil((cooldownUntil - now) / 1000)
        return NextResponse.json({ ok: false, reason: `Reprends ton souffle. ${secLeft}s avant le prochain combat.` }, { status: 429 })
    }

    // PNJ courant
    let npcId = progress.pastagoneTourLastNpc as string | null
    let npc = npcId ? findTourNpcById(npcId) : null
    if (!npc) {
        npc = pickTourNpcRandom()
        npcId = npc.id
    }

    // Leader
    const leader = await (prisma as any).daemon.findUnique({
        where: { userId_slotIndex: { userId, slotIndex: 1 } },
    })
    if (!leader) return NextResponse.json({ ok: false, reason: "Pas de leader." }, { status: 400 })
    if (!leader.unlockedAt) return NextResponse.json({ ok: false, reason: "Daemon pas encore éveillé." }, { status: 400 })
    if (leader.currentHp <= 0) {
        return NextResponse.json({ ok: false, reason: `${leader.name} est K.O. Va à l'infirmerie.` }, { status: 400 })
    }

    // BattleActor player
    const happMult = happinessMultiplier(leader.happiness)
    const maxHp = computeMaxHp(leader.baseEnd, leader.combatLevel, leader.bonusEnd)
    const effI = Math.round((leader.baseInt + leader.bonusInt) * happMult)
    const playerActor: BattleActor = {
        daemonId: leader.id,
        name: leader.name,
        type: leader.type as DaemonType,
        morphology: leader.morphology as Morphology,
        speciesLevel: leader.speciesLevel,
        combatLevel: leader.combatLevel,
        maxHp,
        currentHp: leader.currentHp,
        force: Math.round((leader.baseFor + leader.bonusFor) * happMult),
        vitesse: Math.round((leader.baseVit + leader.bonusVit) * happMult),
        defense: Math.round((leader.baseDef + leader.bonusDef) * happMult),
        intelligence: effI,
        endurance: Math.round((leader.baseEnd + leader.bonusEnd) * happMult),
        happiness: leader.happiness,
        critRate: computeCritRate(effI, leader.happiness),
        attacksEquipped: Array.isArray(leader.attacksEquipped) ? leader.attacksEquipped : ["charge"],
    }

    // Enemy
    const mult = npc.statsMultiplier ?? 1.0
    const baseStat = Math.round(50 * mult)
    const enemyMaxHp = computeMaxHp(baseStat, npc.combatLevel, 0)
    const enemyHapp = npc.happiness ?? 50
    const enemyEnempl = happinessMultiplier(enemyHapp)
    const enemy: BattleEnemy = {
        kind: "pnj",
        name: npc.name,
        type: npc.type as DaemonType,
        morphology: npc.morphology as Morphology,
        speciesLevel: 40,  // emoji bracket
        combatLevel: npc.combatLevel,
        maxHp: enemyMaxHp,
        currentHp: enemyMaxHp,
        force: Math.round(baseStat * enemyEnempl),
        vitesse: Math.round(baseStat * enemyEnempl),
        defense: Math.round(baseStat * enemyEnempl),
        intelligence: Math.round(baseStat * enemyEnempl),
        endurance: Math.round(baseStat * enemyEnempl),
        happiness: enemyHapp,
        critRate: computeCritRate(baseStat, enemyHapp),
        attacksEquipped: npc.attacksEquipped,
        pnjKey: npc.id,
        emoji: npc.emoji,
    }

    // v4.0 Phase 9.A — Formule Pokémon Gen 1 : floor(baseExp × L / 7)
    const baseExp = npc.baseExp ?? BASE_EXP_TOUR_STANDARD
    const rewardXp = computeRewardXp(baseExp, npc.combatLevel)

    const battleId = `tour_${Date.now()}_${Math.floor(Math.random() * 1e6)}`
    const state: BattleState = {
        battleId,
        startedAt: new Date().toISOString(),
        turn: 1,
        playerDaemonId: leader.id,
        player: playerActor,
        enemy,
        log: [
            { kind: "info", text: `${npc.name} (${npc.grade}) entre dans le ring !` },
            { kind: "info", text: npc.introLine },
        ],
        phase: "playerTurn",
        rewardXp,
        rewardEnergy: 0,
        fleeAllowed: false,  // PNJ : pas de fuite (tu encaisses ou tu KO)
    }

    // Persiste : activeBattle + cooldown + last NPC
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            activeBattle: state as unknown as object,
            pastagoneTourLastNpc: npcId,
            pastagoneTourCooldownUntil: new Date(now + COOLDOWN_MS),
        },
    })

    return NextResponse.json({ ok: true, state })
}
