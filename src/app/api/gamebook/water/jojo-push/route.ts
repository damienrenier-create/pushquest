// src/app/api/gamebook/water/jojo-push/route.ts
//
// v3.23n — Quand un joueur est le DERNIER non-poussé du Nexus, JOJO sort
// automatiquement de chez lui et le pousse dans le canal sud de Bourg-Boulette.
//
// Évite le deadlock : si tous les autres joueurs ont déjà nagé, il ne reste
// personne pour pousser le dernier → JOJO s'en occupe lui-même.
//
// Conditions (POST sans body) :
//   - L'appelant doit être sur bourgpates
//   - L'appelant doit avoir swim_set dans son inventaire
//   - L'appelant ne doit PAS avoir firstSwimDone (sinon inutile)
//   - Aucun AUTRE utilisateur non-système avec swim_set ET sans firstSwimDone
//     n'existe (= l'appelant est le dernier)
//
// Effet :
//   - L'appelant : firstSwimDone = true + spawn à la_mer (4, 1)
//   - Renvoie le dialogue narratif de JOJO

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { parseInventory, hasIntactItem } from "@/lib/gamebook/inventory"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const SWIM_SET_KEY = "swim_set"

const CANAL_NORTH_SPAWN = { mapId: "la_mer", posX: 4, posY: 1, direction: "down" as const }

const JOJO_PUSH_LINES = [
    "*Tu sens une main ferme se poser sur ton épaule.*",
    "JOJO : « Toi, tu hésites depuis un moment, non ? *Il sourit gentiment.*»",
    "« Personne d'autre n'osera te pousser maintenant — ils sont tous passés avant toi. »",
    "« Allez. PIAFFINI m'a dit que ce serait toi le suivant. Fais-moi confiance. »",
    "*JOJO te pousse dans le canal. Tu sens le froid te saisir, puis la marée t'emporter doucement vers le large.*",
]

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

    // Conditions de base
    if (progress.mapId !== "bourgpates") {
        return NextResponse.json({ ok: false, reason: "Tu n'es pas à Bourg-Boulette." })
    }
    if (progress.firstSwimDone === true) {
        return NextResponse.json({ ok: false, reason: "Tu sais déjà nager." })
    }
    const inv = parseInventory(progress.inventory)
    if (!hasIntactItem(inv, SWIM_SET_KEY)) {
        return NextResponse.json({ ok: false, reason: "Tu n'as pas le Set de Nage." })
    }

    // Check : suis-je le DERNIER ? On compte les autres users non-système qui ont
    // swim_set mais pas firstSwimDone. Si count == 0 → je suis le dernier.
    const allProgress = await (prisma as any).gamebookProgress.findMany({
        where: {
            chapterId: CHAPTER_ID,
            userId: { not: userId },
            firstSwimDone: false,
        },
        include: { user: { select: { isSystem: true } } },
    })

    const otherCandidates = (allProgress as Array<{
        inventory: unknown
        user: { isSystem: boolean } | null
    }>).filter((p) => {
        if (p.user?.isSystem === true) return false  // créateurs exclus
        const pi = parseInventory(p.inventory)
        return hasIntactItem(pi, SWIM_SET_KEY)  // ils peuvent encore nager
    })

    if (otherCandidates.length > 0) {
        return NextResponse.json({
            ok: false,
            reason: "Il reste d'autres joueurs à pousser avant toi.",
            othersCount: otherCandidates.length,
        })
    }

    // OK : je suis le dernier → JOJO me pousse
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            firstSwimDone: true,
            mapId: CANAL_NORTH_SPAWN.mapId,
            posX: CANAL_NORTH_SPAWN.posX,
            posY: CANAL_NORTH_SPAWN.posY,
            direction: CANAL_NORTH_SPAWN.direction,
            lastSeen: new Date(),
        },
    })

    return NextResponse.json({
        ok: true,
        pushed: true,
        spawn: CANAL_NORTH_SPAWN,
        lines: JOJO_PUSH_LINES,
    })
}
