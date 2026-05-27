// src/app/api/gamebook/pastagone/boss-battle/route.ts
//
// v4.0 Phase 8 — POST : lance le combat contre le DOBERMAN ALPHA, boss final
// de l'arc Pastagone.
//
// Conditions :
//   - pastagoneEscaped === true (cellule passée)
//   - pastagoneBossBeaten !== true (idempotent, ne se relance pas)
//   - Pas d'autre battle active
//
// Stats : Lv 25, statsMultiplier 2.0, attaques punitives, type Combat.
// pnjKey = "doberman_alpha" — la route /battle/action détecte cette clé pour
// mettre pastagoneBossBeaten=true à la victoire.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import {
    computeMaxHp,
    happinessMultiplier,
    computeCritRate,
    computeRewardXp,
    BASE_EXP_BOSS_FINAL,
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
    if (progress.pastagoneBossBeaten === true) {
        return NextResponse.json({ ok: false, reason: "Doberman Alpha déjà vaincu." }, { status: 400 })
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

    // v4.0 Phase 9.C — Boss rebalance : L15 (réaliste après 25 combats Tour de Garde
    // avec la nouvelle formule XP Gen 1) + statsMult 2.5 (compense la baisse de level
    // pour garder le boss menaçant : stat brute 125 partout).
    const bossBaseStat = 125  // 50 × 2.5
    const bossLevel = 15
    const bossMaxHp = computeMaxHp(bossBaseStat, bossLevel, 0)
    const bossHapp = 60
    const enemy: BattleEnemy = {
        kind: "boss",
        // v4.0 lore Pullman — Chef Asriel = boss du Pastagone (Daemon de race Doberman).
        // Le pnjKey "doberman_alpha" est conservé pour la cohérence du tracking côté
        // /battle/action (détection victoire boss → set pastagoneBossBeaten=true).
        name: "CHEF ASRIEL",
        type: "Combat" as DaemonType,
        morphology: "crocs" as Morphology,
        speciesLevel: 70,  // 🐺 grandes bêtes
        combatLevel: bossLevel,
        maxHp: bossMaxHp,
        currentHp: bossMaxHp,
        force: bossBaseStat, vitesse: bossBaseStat, defense: bossBaseStat,
        intelligence: bossBaseStat, endurance: bossBaseStat,
        happiness: bossHapp,
        critRate: computeCritRate(bossBaseStat, bossHapp),
        attacksEquipped: ["ultime_uppercut", "croc_fatal", "morsure", "queue_de_fer"],
        pnjKey: "doberman_alpha",
        emoji: "🐺",
    }

    // v4.0 Phase 9.A — Formule Gen 1 : floor(300 × 15 / 7) = 642 XP
    const rewardXp = computeRewardXp(BASE_EXP_BOSS_FINAL, bossLevel)

    const battleId = `boss_${Date.now()}`
    const state: BattleState = {
        battleId,
        startedAt: new Date().toISOString(),
        turn: 1,
        playerDaemonId: leader.id,
        player: playerActor,
        enemy,
        log: [
            { kind: "info", text: "Le CHEF ASRIEL entre dans l'arène. Sa panthère des neiges Stelmaria gronde derrière lui." },
            { kind: "info", text: "« Tu as battu mes lieutenants, dresseur. Voyons si tu survis à MOI. »" },
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
