// src/app/api/gamebook/hotel/sleep/route.ts
//
// v3.24a-2 — POST : le joueur dort à l'hôtel Bellagiomato de Lasagnas Vegas.
//
// Effets :
//   - energySpentToday → 0 (récupère TOUT ce qui a été dépensé aujourd'hui)
//   - bonusSurplus non touché (les pommes, papa, capitaine accumulés restent)
//   - gourde stored non touchée (faut aller la remplir séparément)
//   - tamagotchi happiness +30 (clamp 100) + lastFedAt = now (reset decay)
//
// Conditions :
//   - Joueur sur la map "lasagnas_hotel"
//   - lastHotelSleepDate !== today (1 fois par jour)
//
// Gratuit (validé Q7 user).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isGamebookFrozen } from "@/lib/gamebook/antiCheat"
import { parseTamagotchi } from "@/lib/gamebook/tamagotchi"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const TAMAGOTCHI_HAPPINESS_BOOST = 30
const TAMAGOTCHI_HAPPINESS_MAX = 100

export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }
    if (isGamebookFrozen(progress as { gamebookFrozenUntil?: Date | null })) {
        return NextResponse.json({ ok: false, reason: "Gamebook gelé.", frozen: true })
    }
    if (progress.mapId !== "lasagnas_hotel") {
        return NextResponse.json({ ok: false, reason: "Tu n'es pas à l'hôtel." })
    }

    const today = getTodayISO()
    const lastSleep = (progress as { lastHotelSleepDate?: string }).lastHotelSleepDate ?? ""
    if (lastSleep === today) {
        return NextResponse.json({
            ok: false,
            reason: "Tu as déjà dormi ici aujourd'hui. Reviens demain.",
        })
    }

    // Reset energySpentToday + boost tamagotchi
    const tam = parseTamagotchi(progress.tamagotchi)
    const updatedTam = tam ? {
        ...tam,
        happiness: Math.min(TAMAGOTCHI_HAPPINESS_MAX, tam.happiness + TAMAGOTCHI_HAPPINESS_BOOST),
        lastFedAt: new Date().toISOString(),
    } : null

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            lastHotelSleepDate: today,
            energySpentToday: 0,
            energySpentDate: today,
            tamagotchi: updatedTam,
            lastSeen: new Date(),
        },
    })

    return NextResponse.json({
        ok: true,
        tamagotchiBoosted: !!tam,
        message: tam
            ? "Tu dors profondément. Au réveil, tu te sens régénéré et ton animal aussi (+30 bonheur)."
            : "Tu dors profondément. Au réveil, tu te sens régénéré.",
    })
}
