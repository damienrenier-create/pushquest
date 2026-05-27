// src/app/api/gamebook/pastagone/infirmerie-heal/route.ts
//
// v4.0 Phase 4.D — POST : FUSILLI soigne ton Daemon leader.
//
// Effet : restaure currentHp = maxHp sur le Daemon slot=1.
// Coût  : 50 reps (energySpentToday += 50).
// Limite : 3 soins / jour (pastagoneInfirmerieUses { date, count }).
//
// Body : aucun. Le leader (slot 1) est ciblé automatiquement.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { computeMaxHp } from "@/lib/gamebook/daemon"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const HEAL_COST = 50
const MAX_USES_PER_DAY = 3

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
        return NextResponse.json({ ok: false, reason: "Pas encore évadé de cellule." }, { status: 403 })
    }

    // Check usage du jour
    const today = new Date().toISOString().slice(0, 10)
    const uses = (progress.pastagoneInfirmerieUses ?? {}) as { date?: string; count?: number }
    const todayCount = uses.date === today ? (uses.count ?? 0) : 0
    if (todayCount >= MAX_USES_PER_DAY) {
        return NextResponse.json({
            ok: false,
            reason: `Limite quotidienne atteinte (${MAX_USES_PER_DAY}/jour). Reviens demain.`,
        }, { status: 400 })
    }

    // Check énergie disponible (calcul cohérent avec /api/gamebook/state getTodayReps)
    const { getTodayISO } = await import("@/lib/challenge")
    const todayISO = getTodayISO()
    const sets = await prisma.exerciseSet.findMany({
        where: { userId, date: todayISO },
    })
    const todayReps = sets.reduce((sum, s) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps), 0)
    const energySpentToday = progress.energySpentDate === today ? (progress.energySpentToday ?? 0) : 0
    const bonusSurplus = (progress as { bonusSurplus?: number }).bonusSurplus ?? 0
    const availableEnergy = Math.max(0, todayReps - energySpentToday + bonusSurplus)
    // v4.0 — Créateurs : padding floor 1000 (cohérent avec state route)
    const userRow = await (prisma as any).user.findUnique({ where: { id: userId }, select: { isSystem: true } })
    const isCreator = userRow?.isSystem === true
    const effectiveEnergy = isCreator ? Math.max(availableEnergy, 1000) : availableEnergy
    if (effectiveEnergy < HEAL_COST) {
        return NextResponse.json({
            ok: false,
            reason: `Pas assez d'énergie. Il en faut ${HEAL_COST}.`,
        }, { status: 400 })
    }

    // Leader slot 1
    const leader = await (prisma as any).daemon.findUnique({
        where: { userId_slotIndex: { userId, slotIndex: 1 } },
    })
    if (!leader) return NextResponse.json({ ok: false, reason: "Pas de Daemon leader." }, { status: 400 })
    if (!leader.unlockedAt) return NextResponse.json({ ok: false, reason: "Daemon pas encore éveillé." }, { status: 400 })

    const maxHp = computeMaxHp(leader.baseEnd, leader.combatLevel, leader.bonusEnd)
    if (leader.currentHp >= maxHp) {
        return NextResponse.json({
            ok: false,
            reason: `${leader.name} est déjà à pleine HP.`,
        }, { status: 400 })
    }

    // Persiste : leader.currentHp = maxHp, energySpentToday += 50, infirmerie uses
    const newUses = { date: today, count: todayCount + 1 }
    await (prisma as any).daemon.update({
        where: { id: leader.id },
        data: { currentHp: maxHp },
    })
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            energySpentToday: energySpentToday + HEAL_COST,
            energySpentDate: today,
            pastagoneInfirmerieUses: newUses,
        },
    })

    return NextResponse.json({
        ok: true,
        leader: { id: leader.id, name: leader.name, currentHp: maxHp, maxHp },
        cost: HEAL_COST,
        usesToday: newUses.count,
        maxUses: MAX_USES_PER_DAY,
        message: `🩺 FUSILLI bande ${leader.name}. HP ${maxHp}/${maxHp}. (${newUses.count}/${MAX_USES_PER_DAY} soins aujourd'hui — coût ${HEAL_COST} reps.)`,
    })
}
