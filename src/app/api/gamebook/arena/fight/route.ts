// src/app/api/gamebook/arena/fight/route.ts
//
// v3.24d — POST : combat à l'Arène Manouche (Lasagnas Vegas).
// Le tamagotchi du joueur affronte un adversaire IA généré (level proche).
// Simulation turn-based simple basée sur les 6 stats animales.
//
// Gating : arenaUnlocked (= IL CAPO vaincu). 1 combat par jour.
// Récompense : +100 reps si victoire, +5 bonheur tamagotchi (cap 100).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { parseTamagotchi, computeAnimalStats, type AnimalStats } from "@/lib/gamebook/tamagotchi"
import { XP_ANIMALS } from "@/lib/xp"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const VICTORY_REWARD_REPS = 100

interface StatBonusJson {
    force?: number; vitesse?: number; defense?: number; hp?: number; intelligence?: number
}

function pickOpponent(playerLevel: number) {
    const lv = Math.max(1, Math.min(100, Math.floor(playerLevel + (Math.random() * 6 - 3))))
    const animal = XP_ANIMALS[lv - 1]
    return { level: lv, name: animal.name, emoji: animal.emoji }
}

function simulateFight(playerStats: AnimalStats, oppStats: AnimalStats): { winner: "player" | "opponent"; log: string[] } {
    let pHp = playerStats.hp
    let oHp = oppStats.hp
    const log: string[] = []
    const playerFirst = playerStats.vitesse >= oppStats.vitesse
    let round = 1
    const MAX_ROUNDS = 20

    while (pHp > 0 && oHp > 0 && round <= MAX_ROUNDS) {
        const attacker = playerFirst ? (round % 2 === 1 ? "player" : "opponent") : (round % 2 === 1 ? "opponent" : "player")
        if (attacker === "player") {
            const dmg = Math.max(1, playerStats.force - Math.floor(oppStats.defense / 2))
            oHp -= dmg
            log.push(`Tour ${round} : ton animal frappe (-${dmg} HP).`)
        } else {
            const dmg = Math.max(1, oppStats.force - Math.floor(playerStats.defense / 2))
            pHp -= dmg
            log.push(`Tour ${round} : l'adversaire frappe (-${dmg} HP).`)
        }
        round++
    }
    return { winner: oHp <= 0 ? "player" : "opponent", log }
}

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

    const arenaUnlocked = (progress as { arenaUnlocked?: boolean }).arenaUnlocked === true
    if (!arenaUnlocked) {
        return NextResponse.json({ ok: false, reason: "L'arène est fermée. Bats IL CAPO pour l'ouvrir." })
    }

    const tam = parseTamagotchi((progress as { tamagotchi?: unknown }).tamagotchi)
    if (!tam || !tam.recovered) {
        return NextResponse.json({ ok: false, reason: "Tu n'as pas d'animal pour combattre." })
    }

    // 1 combat / jour
    const today = getTodayISO()
    const lastArena = (progress as { lastArenaDate?: string }).lastArenaDate ?? ""
    if (lastArena === today) {
        return NextResponse.json({ ok: false, reason: "Tu as déjà combattu aujourd'hui. Reviens demain." })
    }

    // Stats joueur
    const rawBonus = (progress as { tamagotchiStatBonus?: unknown }).tamagotchiStatBonus
    const bonus: StatBonusJson = (rawBonus && typeof rawBonus === "object" && !Array.isArray(rawBonus))
        ? (rawBonus as StatBonusJson)
        : {}
    const playerStats = computeAnimalStats(tam.currentLevel ?? 1, tam.happiness ?? 50, bonus)

    // Adversaire
    const opp = pickOpponent(tam.currentLevel ?? 1)
    const oppStats = computeAnimalStats(opp.level, 50, {})

    const { winner, log } = simulateFight(playerStats, oppStats)
    const won = winner === "player"

    // Récompense
    const energyDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
    const energySpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
    const currentSpent = energyDate === today ? energySpent : 0
    const newSpent = won ? Math.max(0, currentSpent - VICTORY_REWARD_REPS) : currentSpent

    // Bonheur +5 si win
    let newTamagotchi: typeof tam | null = tam
    if (won && tam) {
        const newHappy = Math.min(100, (tam.happiness ?? 50) + 5)
        newTamagotchi = { ...tam, happiness: newHappy }
    }

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            lastArenaDate: today,
            energySpentToday: newSpent,
            energySpentDate: today,
            ...(won && newTamagotchi ? { tamagotchi: newTamagotchi } : {}),
        },
    })

    return NextResponse.json({
        ok: true,
        won,
        opponent: { name: opp.name, emoji: opp.emoji, level: opp.level, stats: oppStats },
        playerStats,
        log,
        reward: won ? { reps: VICTORY_REWARD_REPS, happiness: 5 } : null,
        message: won
            ? `🏆 Victoire ! ${tam.name} bat ${opp.emoji} ${opp.name}. +${VICTORY_REWARD_REPS} reps, +5 bonheur.`
            : `💀 Défaite. ${opp.emoji} ${opp.name} l'emporte. Reviens demain.`,
    })
}
