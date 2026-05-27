// src/app/api/gamebook/daemon/battle/use-item/route.ts
//
// v4.0 Phase 5.C — POST : utilise un consommable Daemon (canUseInBattle) en
// plein combat. Coût : 1 tour (l'ennemi attaque ensuite).
//
// Body : { itemKey: string }
//
// Effets supportés :
//   - "heal_hp"                   : currentHp += amount (cap maxHp), persisté.
//   - "happiness_boost"           : happiness += amount (cap 100), persisté.
//                                   N'affecte PAS le snapshot stats du combat
//                                   en cours, mais améliore la valeur du Daemon
//                                   pour les prochaines fights.
//   - "vitesse_buff_one_battle"   : state.player.vitesse += amount (snapshot
//                                   modifié, perdu en fin de combat).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getItem } from "@/lib/gamebook/items"
import { parseInventory, removeItem, hasIntactItem } from "@/lib/gamebook/inventory"
import { DAEMON_HAPPINESS_MAX, computeMaxHp } from "@/lib/gamebook/daemon"
import type { BattleState } from "@/lib/gamebook/battleState"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { itemKey?: string }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const itemKey = body.itemKey
    if (!itemKey) return NextResponse.json({ ok: false, reason: "itemKey requis" }, { status: 400 })

    const def = getItem(itemKey)
    if (!def?.capabilities.canUseInBattle) {
        return NextResponse.json({ ok: false, reason: "Cet item n'est pas utilisable en combat." }, { status: 400 })
    }
    const cap = def.capabilities.canUseInBattle

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    const currentState = progress.activeBattle as unknown as BattleState | null
    if (!currentState || currentState.phase === "ended") {
        return NextResponse.json({ ok: false, reason: "Aucune battle en cours." }, { status: 400 })
    }

    const inv = parseInventory(progress.inventory)
    if (!hasIntactItem(inv, itemKey)) {
        return NextResponse.json({ ok: false, reason: `Pas de ${def.name} dans le sac.` }, { status: 400 })
    }

    const leader = await (prisma as any).daemon.findUnique({
        where: { id: currentState.playerDaemonId },
    })
    if (!leader || leader.userId !== userId) {
        return NextResponse.json({ ok: false, reason: "Daemon actif introuvable." }, { status: 400 })
    }

    // Sync HP joueur dans le state (anti-cheat)
    const stateBefore: BattleState = {
        ...currentState,
        log: [...currentState.log],
        player: { ...currentState.player, currentHp: leader.currentHp },
        enemy: { ...currentState.enemy },
    }

    const maxHp = computeMaxHp(leader.baseEnd, leader.combatLevel, leader.bonusEnd)

    // Applique l'effet
    let logText = ""
    let newPlayerHp = leader.currentHp
    let newHappiness = leader.happiness
    let newVitesse = stateBefore.player.vitesse

    if (cap.effect === "heal_hp") {
        if (leader.currentHp >= maxHp) {
            return NextResponse.json({ ok: false, reason: `${leader.name} est déjà à pleine HP.` }, { status: 400 })
        }
        newPlayerHp = Math.min(maxHp, leader.currentHp + cap.amount)
        logText = `${leader.name} mange ${def.name} et récupère ${newPlayerHp - leader.currentHp} HP.`
    } else if (cap.effect === "happiness_boost") {
        if (leader.happiness >= DAEMON_HAPPINESS_MAX) {
            return NextResponse.json({ ok: false, reason: `${leader.name} est déjà au max de bonheur.` }, { status: 400 })
        }
        newHappiness = Math.min(DAEMON_HAPPINESS_MAX, leader.happiness + cap.amount)
        logText = `${leader.name} grignote ${def.name}. Bonheur ${newHappiness}/100.`
    } else if (cap.effect === "vitesse_buff_one_battle") {
        newVitesse = stateBefore.player.vitesse + cap.amount
        logText = `${leader.name} avale ${def.name} cul-sec. Vitesse +${cap.amount} pour ce combat !`
    } else {
        return NextResponse.json({ ok: false, reason: "Effet d'item inconnu." }, { status: 400 })
    }

    // Construit le state mis à jour
    const afterItem: BattleState = {
        ...stateBefore,
        log: [...stateBefore.log, { kind: "info", text: logText }],
        player: {
            ...stateBefore.player,
            currentHp: newPlayerHp,
            happiness: newHappiness,
            vitesse: newVitesse,
        },
    }

    // L'ennemi attaque (1 tour consommé) — on importe la fonction depuis battleState
    const { applyPlayerAction } = await import("@/lib/gamebook/battleState")
    // Hack : pour faire jouer le tour ennemi sans action côté joueur, on émet
    // une action "flee" sur un state avec fleeAllowed=false → l'action loggue
    // "impossible de fuir" puis l'ennemi attaque.
    // Mieux : utiliser un nouvel applyEnemyOnlyTurn. Pour simplicité Phase 5.C,
    // on importe applySwitchEnemyTurn et on lui passe le même player (no-op switch).
    const { applySwitchEnemyTurn } = await import("@/lib/gamebook/battleState")
    const enemyTurnRes = applySwitchEnemyTurn(afterItem, afterItem.player)
    // applySwitchEnemyTurn pousse un log "X entre dans l'arène !" qu'on n'aime
    // pas dans ce contexte → on retire la dernière entrée switch.
    const cleanedState: BattleState = {
        ...enemyTurnRes.state,
        log: enemyTurnRes.state.log.filter((l) => !(l.kind === "switch" && l.text.endsWith("entre dans l'arène !"))),
    }
    void applyPlayerAction  // silence unused

    // Persiste : Daemon (HP/happiness), inventaire (-1), activeBattle
    const newInv = removeItem(inv, itemKey, 1)
    const playerData: Record<string, unknown> = {
        currentHp: cleanedState.player.currentHp,  // applique HP après tour ennemi
        happiness: newHappiness,
    }
    await (prisma as any).daemon.update({
        where: { id: leader.id },
        data: playerData,
    })

    const progressData: Record<string, unknown> = { inventory: newInv }
    if (cleanedState.phase === "ended") {
        progressData.activeBattle = null
    } else {
        progressData.activeBattle = cleanedState as unknown as object
    }
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: progressData,
    })

    return NextResponse.json({
        ok: true,
        state: cleanedState,
        message: logText,
        consumed: itemKey,
    })
}
