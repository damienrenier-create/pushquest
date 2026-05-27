// src/app/api/gamebook/pastagone/cuisine-puzzle/route.ts
//
// v4.0 Phase 7 — POST : avance l'énigme BOLOGNION de la cuisine Pastagone.
//
// 3 étapes dans l'ordre :
//   1. Inspecter le sac de pâtes "spaghetti" (foodBag à gauche du comptoir)
//   2. Inspecter le sac de pâtes "bolognaise" (foodBag à droite)
//   3. Mélanger sur le comptoir (shopCounter) → BOLOGNION apparaît
//
// Body : { step: 1 | 2 | 3 }
//
// Au step 3 :
//   - Crée un nouveau Daemon "BOLOGNION" dans le premier slot libre (2-6).
//   - Type "Pate", morphology "ecailles", combatLevel 1, attacksEquipped ["ravioli"].
//   - unlockedAt = now (BOLOGNION naît directement éveillé — créature mutante).
//   - pastagoneBolognionFound = true.
//
// Erreurs : 400 si step pas dans l'ordre, ou si déjà fait.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { computeDaemonBaseStats, computeMaxHp } from "@/lib/gamebook/daemon"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { step?: number }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const step = body.step
    if (step !== 1 && step !== 2 && step !== 3) {
        return NextResponse.json({ ok: false, reason: "step doit être 1, 2 ou 3" }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    if (progress.pastagoneEscaped !== true) {
        return NextResponse.json({ ok: false, reason: "Pas encore évadé." }, { status: 403 })
    }
    if (progress.pastagoneBolognionFound === true) {
        return NextResponse.json({ ok: false, reason: "BOLOGNION déjà rejoint ton équipe." }, { status: 400 })
    }

    const puzzleRaw = (progress.pastagoneCuisinePuzzle ?? {}) as { step1?: boolean; step2?: boolean; step3?: boolean }

    // Vérifie ordre
    if (step === 1 && puzzleRaw.step1 === true) {
        return NextResponse.json({ ok: true, alreadyDone: true, step, message: "Tu as déjà fouillé ce sac." })
    }
    if (step === 2) {
        if (puzzleRaw.step1 !== true) {
            return NextResponse.json({ ok: false, reason: "Inspecte d'abord l'autre sac de pâtes." }, { status: 400 })
        }
        if (puzzleRaw.step2 === true) {
            return NextResponse.json({ ok: true, alreadyDone: true, step, message: "Sac déjà inspecté." })
        }
    }
    if (step === 3) {
        if (puzzleRaw.step1 !== true || puzzleRaw.step2 !== true) {
            return NextResponse.json({ ok: false, reason: "Inspecte d'abord les deux sacs de pâtes." }, { status: 400 })
        }
    }

    const newPuzzle = { ...puzzleRaw, [`step${step}`]: true }

    // Step 1 et 2 : juste flag + dialogue
    if (step !== 3) {
        await (prisma as any).gamebookProgress.update({
            where: { id: progress.id },
            data: { pastagoneCuisinePuzzle: newPuzzle },
        })
        return NextResponse.json({
            ok: true,
            step,
            puzzle: newPuzzle,
            message: step === 1
                ? "Tu fouilles le premier sac. Une étiquette : 'Spaghetti spéciaux — usage à valider'. Mystère."
                : "Tu fouilles le second sac. Une autre étiquette : 'Sauce bolognaise expérimentale — ne pas mélanger'. Hmm.",
        })
    }

    // Step 3 : invoque BOLOGNION dans l'équipe
    // Trouve le premier slot libre (2..6)
    const existingDaemons = await (prisma as any).daemon.findMany({
        where: { userId },
        orderBy: { slotIndex: "asc" },
    })
    const usedSlots = new Set(existingDaemons.map((d: { slotIndex: number }) => d.slotIndex))
    let targetSlot = -1
    for (let s = 2; s <= 6; s++) {
        if (!usedSlots.has(s)) { targetSlot = s; break }
    }
    if (targetSlot === -1) {
        return NextResponse.json({
            ok: false,
            reason: "Ton équipe est pleine (6/6). Libère un slot avant de mélanger les pâtes.",
        }, { status: 400 })
    }

    const baseStats = await computeDaemonBaseStats(userId)
    // BOLOGNION : stats faibles (~350 total). On force des minima.
    const weakStats = {
        force: Math.min(baseStats.force, 60),
        vitesse: Math.min(baseStats.vitesse, 60),
        defense: Math.min(baseStats.defense, 70),
        intelligence: Math.min(baseStats.intelligence, 80),
        endurance: Math.min(baseStats.endurance, 80),
    }

    await (prisma as any).daemon.create({
        data: {
            userId,
            slotIndex: targetSlot,
            name: "BOLOGNION",
            speciesLevel: 50,
            type: "Pate",
            morphology: "ecailles",
            combatLevel: 1,
            combatXp: 0,
            baseFor: weakStats.force,
            baseVit: weakStats.vitesse,
            baseDef: weakStats.defense,
            baseInt: weakStats.intelligence,
            baseEnd: weakStats.endurance,
            currentHp: computeMaxHp(weakStats.endurance, 1, 0),
            happiness: 50,
            attacksKnown: ["ravioli", "charge"],
            attacksEquipped: ["ravioli", "charge"],
            origin: "pastagone_bolognion",
            unlockedAt: new Date(),  // BOLOGNION naît éveillé (créature mutante)
        },
    })

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            pastagoneCuisinePuzzle: newPuzzle,
            pastagoneBolognionFound: true,
        },
    })

    return NextResponse.json({
        ok: true,
        step: 3,
        puzzle: newPuzzle,
        bolognionAdopted: true,
        slot: targetSlot,
        message: "🍝 BOLOGNION ! Une forme spaghetti tortueuse s'élève du comptoir. La pâte rouge dégouline. Il te regarde. \"Tu m'as libéré… Je rejoins ton équipe.\"",
    })
}
