// src/app/api/gamebook/tamagotchi/adopt/route.ts
//
// v3.14 — POST : adopter un tamagotchi chez le vétérinaire de Macaron'île.
// Payload : { name: string }
//
// Pré-requis :
//   - Joueur sur la map "veterinaire" (gating contre adoption à distance)
//   - Pas de tamagotchi déjà adopté (idempotence)
//   - Énergie disponible >= TAMAGOTCHI_ADOPT_COST
//   - Nom valide (1..16 chars, alphanum + espaces/'-')
//
// Effet :
//   - Crée le tamagotchi (egg, happiness 100, feedCount 0)
//   - Débite TAMAGOTCHI_ADOPT_COST reps de l'énergie du jour

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isGamebookFrozen } from "@/lib/gamebook/antiCheat"
import { isCreatorAccount, padAvailableEnergyForCreator } from "@/lib/gamebook/creator"
import { readEnergySnapshot, spendEnergyOnSnapshot, computeAvailableEnergy } from "@/lib/gamebook/energy"
import {
    createTamagotchi,
    isValidTamagotchiName,
    parseTamagotchi,
    TAMAGOTCHI_ADOPT_COST,
    viewTamagotchi,
} from "@/lib/gamebook/tamagotchi"
import { getUserLevelForGamebook } from "@/lib/gamebook/userLevel"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

async function getTodayReps(userId: string): Promise<number> {
    const today = getTodayISO()
    const sets = await prisma.exerciseSet.findMany({
        where: { userId, date: today },
    })
    // v3.23k — 1 sec de gainage = 1/5 énergie (cohérent avec scoring 5s=1pt)
    return sets.reduce((sum: number, s: { exercise: string; reps: number }) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps), 0)
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: Record<string, unknown>
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!isValidTamagotchiName(name)) {
        return NextResponse.json({ ok: false, reason: "Nom invalide (1 à 16 caractères)." })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }

    if (isGamebookFrozen(progress as { gamebookFrozenUntil?: Date | null })) {
        return NextResponse.json({
            ok: false,
            reason: "Gamebook gelé.",
            frozen: true,
            frozenUntil: (progress as { gamebookFrozenUntil?: Date | null }).gamebookFrozenUntil,
        })
    }

    // Gating : doit être chez le vétérinaire
    if (progress.mapId !== "veterinaire") {
        return NextResponse.json({ ok: false, reason: "Tu n'es pas chez le vétérinaire." })
    }

    // Idempotence : déjà adopté ?
    const existing = parseTamagotchi(progress.tamagotchi)
    if (existing) {
        const userLevel = await getUserLevelForGamebook(userId)
        return NextResponse.json({
            ok: false,
            reason: "Tu as déjà un tamagotchi.",
            tamagotchi: viewTamagotchi(existing, userLevel),
        })
    }

    // v4.0 — Énergie disponible avec bonusSurplus
    const today = getTodayISO()
    const snap = readEnergySnapshot(progress, today)
    const todayReps = await getTodayReps(userId)
    const isCreator = await isCreatorAccount(userId)
    const availableEnergy = padAvailableEnergyForCreator(computeAvailableEnergy(todayReps, snap), isCreator)

    if (availableEnergy < TAMAGOTCHI_ADOPT_COST) {
        return NextResponse.json({
            ok: false,
            reason: `Adoption : ${TAMAGOTCHI_ADOPT_COST} reps. Il t'en manque ${TAMAGOTCHI_ADOPT_COST - availableEnergy}.`,
        })
    }

    const nextSnap = spendEnergyOnSnapshot(snap, TAMAGOTCHI_ADOPT_COST, today)
    // v3.23h — L'animal est figé sur le level du 1er passage chez V3T (snapshot dans state GET).
    // Fallback : si le snapshot n'a pas été pris (race condition), on prend le level actuel.
    const snapshotLevel = (progress as { vetFirstVisitLevel?: number | null }).vetFirstVisitLevel
    const levelForAnimal = typeof snapshotLevel === "number" && snapshotLevel >= 1
        ? snapshotLevel
        : await getUserLevelForGamebook(userId)
    const tam = createTamagotchi(name, levelForAnimal)

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            tamagotchi: tam,
            energySpentToday: nextSnap.energySpentToday,
            energySpentDate: today,
            bonusSurplus: nextSnap.bonusSurplus,
            lastSeen: new Date(),
        },
    })

    return NextResponse.json({
        ok: true,
        tamagotchi: viewTamagotchi(tam, levelForAnimal),
        availableEnergy: padAvailableEnergyForCreator(computeAvailableEnergy(todayReps, nextSnap), isCreator),
        energySpentToday: nextSnap.energySpentToday,
        bonusSurplus: nextSnap.bonusSurplus,
    })
}
