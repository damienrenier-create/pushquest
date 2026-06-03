// src/app/api/gamebook/tamagotchi/evolve-daemon/route.ts
//
// v4.y — POST : fait boire la Mega Gourde du Capo (pleine) à l'animal pour le faire
// évoluer en DAEMON.
//
// Pré-requis :
//   - animal récupéré (tam.recovered)
//   - Mega Gourde du Capo présente dans l'inventaire ET remplie au seuil onboardé
//     (stored >= applyRatio(1000, ratio))
//   - pas déjà évolué (daemon slot 1 sans unlockedAt)
//
// Effets :
//   - L'animal se recale sur le NIVEAU XP ACTUEL du joueur (exception assumée à la
//     doctrine v3.23h "animal figé" : c'est une évolution one-shot, pas un catch-up).
//   - Le Daemon slot 1 est mis à jour (espèce/morpho/stats) et ÉVEILLÉ (unlockedAt).
//   - La Mega Gourde est bue (stored remis à 0).
//
// Renvoie le récap (reps all-time + ancien/nouveau palier) pour la cinématique.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { parseTamagotchi } from "@/lib/gamebook/tamagotchi"
import { getUserDifficultyRatio, applyRatio } from "@/lib/gamebook/difficulty"
import { getUserLevelForGamebook } from "@/lib/gamebook/userLevel"
import { ensureDaemonForTamagotchi, getMorphology, computeDaemonBaseStats, computeMaxHp } from "@/lib/gamebook/daemon"
import { getLevelDetails } from "@/lib/xp"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const GOURDE_FULL_BASE = 1000

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

    const tam = parseTamagotchi((progress as { tamagotchi?: unknown }).tamagotchi)
    if (!tam || !tam.recovered) {
        return NextResponse.json({ ok: false, reason: "Tu n'as pas encore d'animal récupéré." })
    }

    // Mega Gourde présente + remplie au seuil onboardé ?
    const ratio = await getUserDifficultyRatio(userId)
    const threshold = applyRatio(GOURDE_FULL_BASE, ratio)
    const inventory: Array<{ itemKey: string; quantity?: number; data?: unknown }> =
        Array.isArray((progress as { inventory?: unknown }).inventory)
            ? ((progress as { inventory: unknown[] }).inventory as Array<{ itemKey: string; quantity?: number; data?: unknown }>)
            : []
    const gourdeIdx = inventory.findIndex((e) => e.itemKey === "mega_gourde")
    if (gourdeIdx < 0) {
        return NextResponse.json({ ok: false, reason: "Tu n'as pas la Mega Gourde du Capo. Bats IL CAPO d'abord." })
    }
    const gourde = inventory[gourdeIdx]
    const stored = gourde.data && typeof gourde.data === "object" && "stored" in gourde.data
        && typeof (gourde.data as { stored?: unknown }).stored === "number"
        ? (gourde.data as { stored: number }).stored
        : 0
    if (stored < threshold) {
        return NextResponse.json({
            ok: false,
            notFull: true,
            stored,
            threshold,
            reason: `La Mega Gourde n'est pas assez pleine (${stored}/${threshold}). Remplis-la à fond à une fontaine.`,
        })
    }

    // Déjà évolué ? (Daemon slot 1 éveillé)
    await ensureDaemonForTamagotchi(userId, progress)
    const daemon = await (prisma as any).daemon.findUnique({
        where: { userId_slotIndex: { userId, slotIndex: 1 } },
    })
    if (!daemon) {
        // ensureDaemonForTamagotchi aurait dû le créer (animal récupéré + level numérique).
        return NextResponse.json({ ok: false, reason: "Daemon introuvable. Reviens voir ton animal puis réessaie." }, { status: 400 })
    }
    if (daemon.unlockedAt) {
        return NextResponse.json({ ok: false, alreadyEvolved: true, reason: `${tam.name} est déjà un Daemon.` })
    }

    // Niveau XP actuel du joueur → l'animal se recale dessus.
    const playerLevel = await getUserLevelForGamebook(userId)
    const newLevel = Math.max(1, Math.min(100, Math.floor(playerLevel)))
    const fromLevel = Math.max(1, Math.min(100, Math.floor(tam.currentLevel ?? 1)))

    // Reps all-time (énergie : PLANK pondéré /5) pour le récap cinématique.
    const allSets = await prisma.exerciseSet.findMany({
        where: { userId },
        select: { exercise: true, reps: true },
    })
    let totalReps = 0
    for (const s of allSets) {
        totalReps += s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps
    }

    // Stats de combat éveillées
    const baseStats = await computeDaemonBaseStats(userId)
    const now = new Date()

    // 1) Animal (Json) recalé sur le niveau du joueur + gourde bue (stored = 0)
    const updatedTam = { ...tam, currentLevel: newLevel }
    const newInventory = inventory.map((e, i) =>
        i === gourdeIdx
            ? { ...e, data: { ...(e.data as object ?? {}), stored: 0 } }
            : e,
    )
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { tamagotchi: updatedTam, inventory: newInventory },
    })

    // 2) Daemon slot 1 : espèce/morpho/stats recalées + ÉVEIL
    await (prisma as any).daemon.update({
        where: { userId_slotIndex: { userId, slotIndex: 1 } },
        data: {
            speciesLevel: newLevel,
            morphology: getMorphology(newLevel),
            baseFor: baseStats.force,
            baseVit: baseStats.vitesse,
            baseDef: baseStats.defense,
            baseInt: baseStats.intelligence,
            baseEnd: baseStats.endurance,
            currentHp: computeMaxHp(baseStats.endurance, daemon?.combatLevel ?? 1, 0),
            unlockedAt: now,
        },
    })

    const fromAnimal = getLevelDetails(fromLevel)
    const toAnimal = getLevelDetails(newLevel)

    return NextResponse.json({
        ok: true,
        evolved: true,
        animalName: tam.name,
        totalReps,
        fromLevel,
        toLevel: newLevel,
        fromAnimal: { name: fromAnimal.name, emoji: fromAnimal.emoji },
        toAnimal: { name: toAnimal.name, emoji: toAnimal.emoji },
        tamagotchi: updatedTam,
        inventory: newInventory,
    })
}
