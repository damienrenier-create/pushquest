// src/app/api/gamebook/daemon/list/route.ts
//
// v4.0 Phase 1.B — GET : retourne l'équipe complète des Daemons du joueur
// (jusqu'à 6 slots), ordonnée par slotIndex.
//
// Chaque Daemon : stats de base + bonus + HP courant + level/XP + état complet.
// Cette route est en COEXISTENCE avec l'ancien GamebookProgress.tamagotchi (Json) :
// la Phase 1.A a auto-migré le tamagotchi vers Daemon slot 1, donc tous les joueurs
// existants ont au moins un Daemon en slot 1.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import {
    computeMaxHp,
    happinessMultiplier,
    computeCritRate,
    xpForLevel,
    levelFromXp,
} from "@/lib/gamebook/daemon"

export const dynamic = "force-dynamic"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    const daemons = await (prisma as any).daemon.findMany({
        where: { userId },
        orderBy: { slotIndex: "asc" },
    })

    // Enrichir chaque daemon avec stats calculées
    const enriched = daemons.map((d: any) => {
        const happMult = happinessMultiplier(d.happiness)
        const effF = Math.round((d.baseFor + d.bonusFor) * happMult)
        const effV = Math.round((d.baseVit + d.bonusVit) * happMult)
        const effD = Math.round((d.baseDef + d.bonusDef) * happMult)
        const effI = Math.round((d.baseInt + d.bonusInt) * happMult)
        const effE = Math.round((d.baseEnd + d.bonusEnd) * happMult)
        const maxHp = computeMaxHp(d.baseEnd, d.combatLevel, d.bonusEnd)
        const critRate = computeCritRate(effI, d.happiness)
        const xpToNext = xpForLevel(d.combatLevel + 1)
        const xpCurrent = d.combatXp
        return {
            id: d.id,
            slotIndex: d.slotIndex,
            name: d.name,
            speciesLevel: d.speciesLevel,
            type: d.type,
            morphology: d.morphology,
            combatLevel: d.combatLevel,
            combatXp: xpCurrent,
            xpToNextLevel: xpToNext,
            xpProgressPct: xpToNext > 0 ? Math.min(100, Math.round((xpCurrent / xpToNext) * 100)) : 0,
            // Stats brutes (avant bonheur)
            stats: {
                force: d.baseFor + d.bonusFor,
                vitesse: d.baseVit + d.bonusVit,
                defense: d.baseDef + d.bonusDef,
                intelligence: d.baseInt + d.bonusInt,
                endurance: d.baseEnd + d.bonusEnd,
            },
            // Stats effectives (après modulateur bonheur)
            effectiveStats: {
                force: effF,
                vitesse: effV,
                defense: effD,
                intelligence: effI,
                endurance: effE,
            },
            // Détail base/bonus pour la UI répartir-points
            baseStats: {
                force: d.baseFor, vitesse: d.baseVit, defense: d.baseDef,
                intelligence: d.baseInt, endurance: d.baseEnd,
            },
            bonusStats: {
                force: d.bonusFor, vitesse: d.bonusVit, defense: d.bonusDef,
                intelligence: d.bonusInt, endurance: d.bonusEnd,
            },
            currentHp: d.currentHp,
            maxHp,
            happiness: d.happiness,
            happinessMultiplier: happMult,
            critRate,
            attacksKnown: Array.isArray(d.attacksKnown) ? d.attacksKnown : [],
            attacksEquipped: Array.isArray(d.attacksEquipped) ? d.attacksEquipped : [],
            equippedItems: Array.isArray(d.equippedItems) ? d.equippedItems : [],
            recovered: d.recovered,
            inBag: d.inBag,
            origin: d.origin,
            // v4.0 Phase 1.D.bis — gate sérum
            unlocked: d.unlockedAt !== null && d.unlockedAt !== undefined,
            unlockedAt: d.unlockedAt ?? null,
            // v4.0 Phase 3 — Saiyan : points en attente de répartition
            pendingStatPoints: d.pendingStatPoints ?? 0,
            // Tracking Saiyan (visible côté UI)
            saiyan: {
                energySpentThisLevel: d.energySpentThisLevel,
                koCountThisLevel: d.koCountThisLevel,
                easyBattlesCount: d.easyBattlesCount,
                hardBattlesCount: d.hardBattlesCount,
                battlesTotal: d.battlesTotal,
                damageReceivedTotal: d.damageReceivedTotal,
            },
        }
    })

    return NextResponse.json({
        ok: true,
        daemons: enriched,
        leaderSlot: enriched.length > 0 ? enriched[0].slotIndex : null,
        teamSize: enriched.length,
        maxTeamSize: 6,
    })
}

// Helper exporté pour utilisation dans d'autres routes éventuellement
export function _levelFromXp(xp: number) {
    return levelFromXp(xp)
}
