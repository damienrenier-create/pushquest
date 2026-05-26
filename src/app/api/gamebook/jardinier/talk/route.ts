// src/app/api/gamebook/jardinier/talk/route.ts
//
// v3.24a-4 — POST : le joueur parle au jardinier BASILICO (Lasagnas Vegas).
//
// Effet :
//   - 1ère fois : démarre la mission (jardinierMissionActive = true), reset fruitOrder
//   - Visites suivantes (mission active, arrosoir non donné) : reset fruitOrder pour
//     ré-essayer la séquence sans nécessairement faire un "give-up"
//   - Renvoie la séquence cible (côté serveur uniquement, le client ne la connaît pas)
//
// La séquence cible est FIXE pour tous les joueurs (pour simplifier) :
//   ["cherry", "olive", "pear", "peach"] dans cet ordre exact
//
// Pour valider, le joueur :
//   1. Parle à BASILICO (cette route) → reset fruitOrder
//   2. Cueille les fruits dans l'ordre exact
//   3. Revient parler à BASILICO → /api/gamebook/jardinier/check valide
//   4. Si OK : reçoit l'arrosoir
//
// La séquence est SECRÈTE — BASILICO ne dit pas l'ordre, le joueur doit deviner.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

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
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }

    if (progress.mapId !== "lasagnas_vegas") {
        return NextResponse.json({ ok: false, reason: "Tu n'es pas à Lasagnas Vegas." })
    }

    const alreadyGiven = (progress as { jardinierArrosoirGiven?: boolean }).jardinierArrosoirGiven === true
    if (alreadyGiven) {
        return NextResponse.json({
            ok: true,
            alreadyGiven: true,
            message: "BASILICO te sourit. \"Tu as ton arrosoir. Va arroser, jeune pousse.\"",
        })
    }

    // (Re)start la mission : reset fruitOrder, activer flag
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            jardinierMissionActive: true,
            jardinierFruitOrder: [],
        },
    })

    return NextResponse.json({
        ok: true,
        missionStarted: true,
        message: "BASILICO essuie son chapeau. \"Mission acceptée. Va cueillir les fruits dans le BON ORDRE. Reviens me voir quand tu penses avoir réussi.\"",
    })
}
