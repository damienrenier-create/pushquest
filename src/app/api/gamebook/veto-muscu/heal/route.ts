// src/app/api/gamebook/veto-muscu/heal/route.ts
//
// v3.36 — POST : DOC PROTÉINE (véto de Muscuville) remet le tamagotchi au bonheur max.
//
// Conditions :
//   - Sur la map "muscuville"
//   - Tamagotchi adopté
//   - 1× par jour (vetoMuscuLastVisitDate != today)
//
// Effet : happiness = 100 (max), lastFedAt = now (reset du decay).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { parseTamagotchi, TAMAGOTCHI_HAPPINESS_MAX } from "@/lib/gamebook/tamagotchi"

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

    if (progress.mapId !== "muscuville") {
        return NextResponse.json({ ok: false, reason: "Tu n'es pas à Muscuville." })
    }

    const tam = parseTamagotchi((progress as { tamagotchi?: unknown }).tamagotchi)
    if (!tam) {
        return NextResponse.json({ ok: false, reason: "Tu n'as pas encore d'animal. Va voir V3T à Macaron'île." })
    }

    const today = getTodayISO()
    const lastVisit = (progress as { vetoMuscuLastVisitDate?: string }).vetoMuscuLastVisitDate ?? ""
    if (lastVisit === today) {
        return NextResponse.json({
            ok: false,
            alreadyVisited: true,
            reason: "DOC PROTÉINE déjà visité aujourd'hui. Reviens demain.",
        })
    }

    const newTamagotchi = {
        ...tam,
        happiness: TAMAGOTCHI_HAPPINESS_MAX,
        lastFedAt: new Date().toISOString(),
    }

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            tamagotchi: newTamagotchi,
            vetoMuscuLastVisitDate: today,
        },
    })

    return NextResponse.json({
        ok: true,
        healed: true,
        happiness: TAMAGOTCHI_HAPPINESS_MAX,
        message: `🩺 DOC PROTÉINE caresse ${tam.name} avec douceur. *« Voilà, il est tout heureux maintenant. Bonheur ${TAMAGOTCHI_HAPPINESS_MAX}/100. Reviens demain si besoin. »*`,
    })
}
