// src/app/api/gamebook/pastagone/capolino-mid-battle/route.ts
//
// v4.0 — POST : combat contre CAPOLINO en mid-arc Pastagone (3ᵉ rencontre du rival).
//
// Lore : CAPOLINO te défie pour prouver à son père IL CAPO qu'il vaut quelque chose
// dans le Pastagone. Combat Combat-type Lv 13, statsMult 1.5.
// pnjKey = "capolino_mid" — détecté par /battle/action.
//
// Conditions :
//   - pastagoneEscaped === true
//   - pastagoneCapolinoMidBeaten !== true
//   - Pas d'autre battle active

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import {
    computeMaxHp,
    happinessMultiplier,
    computeCritRate,
    computeRewardXp,
    BASE_EXP_RIVAL,
    type DaemonType,
    type Morphology,
} from "@/lib/gamebook/daemon"
import type { BattleActor, BattleEnemy, BattleState } from "@/lib/gamebook/battleState"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

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
    if (progress.pastagoneCapolinoMidBeaten === true) {
        return NextResponse.json({ ok: false, reason: "CAPOLINO déjà vaincu ici." }, { status: 400 })
    }
    if (progress.activeBattle) {
        return NextResponse.json({ ok: false, reason: "Une battle est déjà en cours." }, { status: 409 })
    }

    const leader = await (prisma as any).daemon.findUnique({
        where: { userId_slotIndex: { userId, slotIndex: 1 } },
    })
    if (!leader) return NextResponse.json({ ok: false, reason: "Pas de leader." }, { status: 400 })
    if (!leader.unlockedAt) return NextResponse.json({ ok: false, reason: "Daemon pas encore éveillé." }, { status: 400 })
    if (leader.currentHp <= 0) {
        return NextResponse.json({ ok: false, reason: `${leader.name} est K.O. Soigne-le.` }, { status: 400 })
    }

    // BattleActor player (snapshot avec wearables)
    const happMult = happinessMultiplier(leader.happiness)
    let effF = Math.round((leader.baseFor + leader.bonusFor) * happMult)
    let effV = Math.round((leader.baseVit + leader.bonusVit) * happMult)
    let effD = Math.round((leader.baseDef + leader.bonusDef) * happMult)
    let effI = Math.round((leader.baseInt + leader.bonusInt) * happMult)
    let effE = Math.round((leader.baseEnd + leader.bonusEnd) * happMult)
    const maxHp = computeMaxHp(leader.baseEnd, leader.combatLevel, leader.bonusEnd)
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
        critRate: computeCritRate(effI, leader.happiness),
        attacksEquipped: Array.isArray(leader.attacksEquipped) ? leader.attacksEquipped : ["charge"],
    }

    // Daemon CAPOLINO mid : type Combat (sa Daemon "vrai" type — celui qu'il prendra opposé
    // au choix du joueur sera révélé en 4ᵉ rencontre).
    const enemyBaseStat = Math.round(50 * 1.5)  // 75
    const enemyLevel = 13
    const enemyMaxHp = computeMaxHp(enemyBaseStat, enemyLevel, 0)
    const enemyHapp = 45  // rageur
    const enemy: BattleEnemy = {
        kind: "rival",
        name: "CAPOLINO (Pastagone)",
        type: "Combat" as DaemonType,
        morphology: "crocs" as Morphology,
        speciesLevel: 50,  // 🥊 boxeur
        combatLevel: enemyLevel,
        maxHp: enemyMaxHp,
        currentHp: enemyMaxHp,
        force: enemyBaseStat + 15,  // Combat = bonus force
        vitesse: enemyBaseStat,
        defense: enemyBaseStat,
        intelligence: enemyBaseStat - 10,  // pas malin
        endurance: enemyBaseStat,
        happiness: enemyHapp,
        critRate: computeCritRate(enemyBaseStat - 10, enemyHapp),
        attacksEquipped: ["croc_fatal", "ultime_uppercut", "morsure"],
        pnjKey: "capolino_mid",
        emoji: "🥊",
    }

    const rewardXp = computeRewardXp(BASE_EXP_RIVAL, enemyLevel)

    const battleId = `capomid_${Date.now()}`
    const state: BattleState = {
        battleId,
        startedAt: new Date().toISOString(),
        turn: 1,
        playerDaemonId: leader.id,
        player: playerActor,
        enemy,
        log: [
            { kind: "info", text: "CAPOLINO te bloque la route. Son Daemon Combat tape déjà du pied." },
            { kind: "info", text: "« Cette fois, c'est moi qui décide. Mon père va voir ce que je vaux. »" },
        ],
        phase: "playerTurn",
        rewardXp,
        rewardEnergy: 0,
        fleeAllowed: false,
    }

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { activeBattle: state as unknown as object },
    })

    return NextResponse.json({ ok: true, state })
}
