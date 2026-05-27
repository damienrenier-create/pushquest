// src/app/api/gamebook/daemon/battle/start/route.ts
//
// v4.0 Phase 2.B — POST : démarre une battle.
//
// Body :
//   {
//     enemy: {
//       kind: "wild" | "pnj" | "rival" | "boss",
//       name: string,
//       type: DaemonType,
//       morphology: Morphology,
//       speciesLevel: number,    // 1..100 (pour emoji)
//       combatLevel: number,     // 1..50
//       happiness?: number,      // défaut 50 (ennemis neutres)
//       attacksEquipped: string[],
//       pnjKey?: string,
//       emoji?: string,
//     },
//     fleeAllowed?: boolean,     // défaut true pour wild, false pour pnj/rival/boss
//     rewardXp?: number,         // défaut auto-calculé (cube formula)
//     rewardEnergy?: number,     // défaut 0
//   }
//
// Garantit qu'une seule battle peut être active à tout instant : si une autre est en
// cours, renvoie 409 (le client doit la résoudre ou abandonner avant).
//
// Le Daemon leader (slot 1, unlocked) est désigné automatiquement comme acteur.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import {
    computeMaxHp,
    happinessMultiplier,
    computeCritRate,
    type DaemonType,
    type Morphology,
} from "@/lib/gamebook/daemon"
import type { BattleState, BattleEnemy, BattleActor } from "@/lib/gamebook/battleState"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

interface StartBody {
    enemy?: {
        kind?: "wild" | "pnj" | "rival" | "boss"
        name?: string
        type?: string
        morphology?: string
        speciesLevel?: number
        combatLevel?: number
        happiness?: number
        attacksEquipped?: string[]
        pnjKey?: string
        emoji?: string
    }
    fleeAllowed?: boolean
    rewardXp?: number
    rewardEnergy?: number
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: StartBody
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }

    const e = body.enemy
    if (!e || !e.name || !e.type || !e.morphology || typeof e.combatLevel !== "number" || typeof e.speciesLevel !== "number") {
        return NextResponse.json({ ok: false, reason: "enemy { name, type, morphology, speciesLevel, combatLevel } requis" }, { status: 400 })
    }
    const kind = (e.kind ?? "wild") as "wild" | "pnj" | "rival" | "boss"

    // Cherche le progress + battle en cours
    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    if (progress.activeBattle) {
        return NextResponse.json({
            ok: false,
            reason: "Une battle est déjà en cours.",
            activeBattle: progress.activeBattle,
        }, { status: 409 })
    }

    // Récupère le leader (slot 1) + vérifie qu'il est unlocked et pas KO
    const leader = await (prisma as any).daemon.findUnique({
        where: { userId_slotIndex: { userId, slotIndex: 1 } },
    })
    if (!leader) return NextResponse.json({ ok: false, reason: "Aucun Daemon en slot 1." }, { status: 400 })
    if (!leader.unlockedAt) {
        return NextResponse.json({ ok: false, reason: "Daemon pas encore éveillé (sérum requis)." }, { status: 400 })
    }
    if (leader.currentHp <= 0) {
        return NextResponse.json({ ok: false, reason: `${leader.name} est K.O. Soigne-le d'abord.` }, { status: 400 })
    }

    // Construit BattleActor joueur (snapshot avec bonheur appliqué)
    const happMult = happinessMultiplier(leader.happiness)
    let effF = Math.round((leader.baseFor + leader.bonusFor) * happMult)
    let effV = Math.round((leader.baseVit + leader.bonusVit) * happMult)
    let effD = Math.round((leader.baseDef + leader.bonusDef) * happMult)
    let effI = Math.round((leader.baseInt + leader.bonusInt) * happMult)
    let effE = Math.round((leader.baseEnd + leader.bonusEnd) * happMult)
    const maxHp = computeMaxHp(leader.baseEnd, leader.combatLevel, leader.bonusEnd)
    const attacksEq = Array.isArray(leader.attacksEquipped) ? leader.attacksEquipped : ["charge"]

    // v4.0 Phase 5.B — Snapshot des wearables équipés (canEquipDaemon).
    // Daemon.equippedItems est un Json array de { itemKey: string, durability?: number }.
    // Chaque item de type canEquipDaemon ajoute son bonus à la stat correspondante.
    const equipped = Array.isArray(leader.equippedItems) ? leader.equippedItems : []
    if (equipped.length > 0) {
        const { getItem } = await import("@/lib/gamebook/items")
        for (const eq of equipped) {
            const itemKey = typeof eq === "string" ? eq : (eq as { itemKey?: string }).itemKey
            if (!itemKey) continue
            const def = getItem(itemKey)
            const cap = def?.capabilities.canEquipDaemon
            if (!cap) continue
            if (cap.stat === "force") effF += cap.bonus
            else if (cap.stat === "vitesse") effV += cap.bonus
            else if (cap.stat === "defense") effD += cap.bonus
            else if (cap.stat === "intelligence") effI += cap.bonus
            else if (cap.stat === "endurance") effE += cap.bonus
        }
    }

    const critRate = computeCritRate(effI, leader.happiness)

    const playerActor: BattleActor = {
        daemonId: leader.id,
        name: leader.name,
        type: leader.type as DaemonType,
        morphology: leader.morphology as Morphology,
        speciesLevel: leader.speciesLevel,
        combatLevel: leader.combatLevel,
        maxHp,
        currentHp: leader.currentHp,
        force: effF, vitesse: effV, defense: effD, intelligence: effI, endurance: effE,
        happiness: leader.happiness,
        critRate,
        attacksEquipped: attacksEq,
    }

    // Construit BattleEnemy (stats calculées à partir des inputs)
    // Snapshot : on assume des stats "moyennes" pour un ennemi à combatLevel donné
    // (Phase 2.B : on garde simple ; Phase 4 ajustera par PNJ).
    const enemyHappiness = e.happiness ?? 50
    const enemyHappMult = happinessMultiplier(enemyHappiness)
    const enemyBase = 50  // base stat moyenne
    const enemyMaxHp = computeMaxHp(enemyBase, e.combatLevel, 0)
    const enemyCritRate = computeCritRate(enemyBase, enemyHappiness)
    const enemy: BattleEnemy = {
        kind,
        name: e.name,
        type: e.type as DaemonType,
        morphology: e.morphology as Morphology,
        speciesLevel: e.speciesLevel,
        combatLevel: e.combatLevel,
        maxHp: enemyMaxHp,
        currentHp: enemyMaxHp,
        force: Math.round(enemyBase * enemyHappMult),
        vitesse: Math.round(enemyBase * enemyHappMult),
        defense: Math.round(enemyBase * enemyHappMult),
        intelligence: Math.round(enemyBase * enemyHappMult),
        endurance: Math.round(enemyBase * enemyHappMult),
        happiness: enemyHappiness,
        critRate: enemyCritRate,
        attacksEquipped: Array.isArray(e.attacksEquipped) && e.attacksEquipped.length > 0 ? e.attacksEquipped : ["charge"],
        pnjKey: e.pnjKey,
        emoji: e.emoji,
    }

    // Récompense XP par défaut : ~(enemyLvl × 50)
    const rewardXp = typeof body.rewardXp === "number" ? body.rewardXp : Math.max(10, e.combatLevel * 50)
    const rewardEnergy = typeof body.rewardEnergy === "number" ? body.rewardEnergy : 0

    const battleId = `b_${Date.now()}_${Math.floor(Math.random() * 1e6)}`
    const state: BattleState = {
        battleId,
        startedAt: new Date().toISOString(),
        turn: 1,
        playerDaemonId: leader.id,
        player: playerActor,
        enemy,
        log: [
            { kind: "info", text: `Un ${enemy.name} apparaît !` },
            { kind: "info", text: `${playerActor.name}, à toi !` },
        ],
        phase: "playerTurn",
        rewardXp,
        rewardEnergy,
        fleeAllowed: typeof body.fleeAllowed === "boolean" ? body.fleeAllowed : (kind === "wild"),
    }

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { activeBattle: state as unknown as object },
    })

    return NextResponse.json({ ok: true, state })
}
