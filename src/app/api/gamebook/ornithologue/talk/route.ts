// src/app/api/gamebook/ornithologue/talk/route.ts
//
// v3.29 — POST : interaction avec l'ORNITHOLOGUE (grass_sud).
// Si le joueur a un tamagotchi récupéré ET que c'est un oiseau,
// l'ornithologue le félicite et lui donne +50 énergies (1 fois).
// Sinon, dialogue normal (géré côté client via dialoguesAfter du NPC).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isAnimalBird } from "@/lib/xp"
import { parseTamagotchi } from "@/lib/gamebook/tamagotchi"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const BIRD_BONUS_ENERGY = 50

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
        return NextResponse.json({
            ok: true,
            line: "*L'ornithologue te regarde avec un sourire bienveillant.* « Reviens quand tu auras adopté ton compagnon. »",
        })
    }

    // Le level affiché de l'animal = soit le current, soit le display
    const level = tam.currentLevel ?? 1
    const isBird = isAnimalBird(level)

    const bonusGiven = (progress as { ornithologueBirdBonusGiven?: boolean }).ornithologueBirdBonusGiven === true

    if (!isBird) {
        return NextResponse.json({
            ok: true,
            isBird: false,
            line: "*L'ornithologue regarde ton compagnon.* « Ah, pas un oiseau celui-là. Joli quand même. Continue d'observer les arbres, parfois ils cachent des trésors à plumes. »",
        })
    }

    if (bonusGiven) {
        return NextResponse.json({
            ok: true,
            isBird: true,
            alreadyGiven: true,
            line: "*L'ornithologue caresse ton compagnon à plumes.* « Mon ami volatile préféré. Continue. »",
        })
    }

    // Bonus +50 énergies : on diminue energySpentToday de 50 (= +50 énergie dispo).
    const today = getTodayISO()
    const storedDate = (progress as { energySpentDate?: string }).energySpentDate ?? ""
    const storedSpent = (progress as { energySpentToday?: number }).energySpentToday ?? 0
    const currentSpent = storedDate === today ? storedSpent : 0
    const newSpent = Math.max(0, currentSpent - BIRD_BONUS_ENERGY)

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            ornithologueBirdBonusGiven: true,
            energySpentToday: newSpent,
            energySpentDate: today,
        },
    })

    return NextResponse.json({
        ok: true,
        isBird: true,
        bonus: BIRD_BONUS_ENERGY,
        line: `*L'ornithologue s'illumine.* « UN OISEAU ! Un vrai ! Quelle merveille. Tiens, prends ceci — +${BIRD_BONUS_ENERGY} énergies. Continue de l'observer, il a beaucoup à t'apprendre. »`,
    })
}
