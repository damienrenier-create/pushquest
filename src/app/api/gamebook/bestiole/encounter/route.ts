// src/app/api/gamebook/bestiole/encounter/route.ts
//
// v3.19b — POST : déclenche une rencontre avec les bestioles des hautes herbes du sud.
// Body : { name?: string } — nom optionnel donné à l'espèce (utilisé seulement à la 1re rencontre).
//
// Logique :
//   - Pré-requis : mapId === "grass_sud"
//   - Si bestiolesFirstEncountered === false :
//       * 1re rencontre : pas de perte d'énergie. Sauve le nom donné si présent.
//       * Set bestiolesFirstEncountered = true
//       * Renvoie { kind: "first", message: "Aïe !" }
//   - Sinon :
//       * -10 reps (via energySpentToday)
//       * Renvoie { kind: "attack", reps: 10, message: "Tes [nom espèce] te mordent" }
//
// Note : la route reste appelable même si tamagotchi.recovered = true (le filtre côté MapClient
// empêche l'encounter dans ce cas — bestiole filtrée). Mais idempotent et safe au cas où.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isGamebookFrozen } from "@/lib/gamebook/antiCheat"
import { isCreatorAccount, padAvailableEnergyForCreator } from "@/lib/gamebook/creator"
import { readEnergySnapshot, spendEnergyOnSnapshot, computeAvailableEnergy } from "@/lib/gamebook/energy"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const BESTIOLE_ATTACK_COST = 10

function sanitizeName(raw: unknown): string | null {
    if (typeof raw !== "string") return null
    const trimmed = raw.trim()
    if (trimmed.length === 0 || trimmed.length > 24) return null
    if (!/^[\p{L}\p{N} '-]+$/u.test(trimmed)) return null
    return trimmed
}

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

    let body: Record<string, unknown> = {}
    try {
        body = await req.json()
    } catch {
        // body vide → OK (pas de nom à enregistrer)
    }
    const proposedName = sanitizeName(body.name)

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }
    if (isGamebookFrozen(progress as { gamebookFrozenUntil?: Date | null })) {
        return NextResponse.json({ ok: false, reason: "Gamebook gelé.", frozen: true })
    }
    if (progress.mapId !== "grass_sud") {
        return NextResponse.json({ ok: false, reason: "Tu n'es pas dans les hautes herbes du sud." })
    }

    const firstEncountered = (progress as { bestiolesFirstEncountered?: boolean }).bestiolesFirstEncountered === true
    const speciesName = (progress as { bestiolesSpeciesName?: string | null }).bestiolesSpeciesName ?? null

    if (!firstEncountered) {
        // Première rencontre : pas de perte, sauve le nom si présent
        const newName = proposedName ?? speciesName  // le nom passé en body, ou conservation de l'ancien si déjà set
        await (prisma as any).gamebookProgress.update({
            where: { id: progress.id },
            data: {
                bestiolesFirstEncountered: true,
                bestiolesSpeciesName: newName,
                lastSeen: new Date(),
            },
        })
        return NextResponse.json({
            ok: true,
            kind: "first",
            speciesName: newName,
            message: newName
                ? `Aïe ! Tu te fais mordre par les ${newName} ! Tu recules. (Pas de perte cette fois — mais sans animal compagnon, la prochaine fois ce sera -10 reps. Va voir V3T à Macaron'île.)`
                : "Aïe ! Tu te fais mordre par les bestioles ! Tu recules. (Pas de perte cette fois — mais sans animal compagnon, la prochaine fois ce sera -10 reps. Va voir V3T à Macaron'île.)",
        })
    }

    // v4.0 — Morsure : consomme bonusSurplus d'abord puis energySpentToday
    const today = getTodayISO()
    const snap = readEnergySnapshot(progress, today)
    const nextSnap = spendEnergyOnSnapshot(snap, BESTIOLE_ATTACK_COST, today)

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            energySpentToday: nextSnap.energySpentToday,
            energySpentDate: today,
            bonusSurplus: nextSnap.bonusSurplus,
            lastSeen: new Date(),
        },
    })

    const todayReps = await getTodayReps(userId)
    const isCreator = await isCreatorAccount(userId)
    const availableEnergy = padAvailableEnergyForCreator(computeAvailableEnergy(todayReps, nextSnap), isCreator)

    return NextResponse.json({
        ok: true,
        kind: "attack",
        speciesName,
        cost: BESTIOLE_ATTACK_COST,
        availableEnergy,
        energySpentToday: nextSnap.energySpentToday,
        bonusSurplus: nextSnap.bonusSurplus,
        message: speciesName
            ? `Les ${speciesName} te mordent encore ! -${BESTIOLE_ATTACK_COST} reps.`
            : `Les bestioles te mordent encore ! -${BESTIOLE_ATTACK_COST} reps.`,
    })
}
