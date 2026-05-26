// src/app/api/gamebook/tamagotchi/use-serum/route.ts
//
// v3.24d — POST : consomme 1000 reps de la banque "sérum d'intelligence"
// (gagnée à la défaite d'IL CAPO) pour ajouter +1 Intelligence permanente
// au tamagotchi du joueur.
//
// Idempotent : si serumIntelligenceReps < 1000 → refus.
// Peut être répété tant qu'il reste assez de reps en banque.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { parseTamagotchi } from "@/lib/gamebook/tamagotchi"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const SERUM_DOSE_COST = 1000

interface StatBonusJson {
    force?: number
    vitesse?: number
    defense?: number
    hp?: number
    intelligence?: number
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

    const tam = parseTamagotchi((progress as { tamagotchi?: unknown }).tamagotchi)
    if (!tam || !tam.recovered) {
        return NextResponse.json({ ok: false, reason: "Pas d'animal récupéré." })
    }

    const banked = (progress as { serumIntelligenceReps?: number }).serumIntelligenceReps ?? 0
    if (banked < SERUM_DOSE_COST) {
        return NextResponse.json({
            ok: false,
            reason: `Il te faut ${SERUM_DOSE_COST} reps en banque (tu as ${banked}). Bats IL CAPO pour en gagner.`,
        })
    }

    const rawBonus = (progress as { tamagotchiStatBonus?: unknown }).tamagotchiStatBonus
    const bonus: StatBonusJson = (rawBonus && typeof rawBonus === "object" && !Array.isArray(rawBonus))
        ? (rawBonus as StatBonusJson)
        : {}
    const newBonus: StatBonusJson = { ...bonus, intelligence: (bonus.intelligence ?? 0) + 1 }
    const newBanked = banked - SERUM_DOSE_COST
    const newConsumed = ((progress as { serumIntelligenceConsumed?: number }).serumIntelligenceConsumed ?? 0) + 1

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            tamagotchiStatBonus: newBonus,
            serumIntelligenceReps: newBanked,
            serumIntelligenceConsumed: newConsumed,
        },
    })

    return NextResponse.json({
        ok: true,
        intelligenceBonus: newBonus.intelligence,
        bankedRemaining: newBanked,
        message: `🧠 +1 Intelligence ! Bonus permanent : +${newBonus.intelligence}. Banque restante : ${newBanked} reps.`,
    })
}
