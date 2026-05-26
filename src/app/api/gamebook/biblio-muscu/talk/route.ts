// src/app/api/gamebook/biblio-muscu/talk/route.ts
//
// v3.35 — POST : MIRABELLE (bibliothécaire Muscuville) offre le Livre des Arbres
// SI le joueur prouve qu'il aime lire :
//   1. Avoir découvert ≥ 3 sortes d'arbres (treesDiscovered.length >= 3)
//   2. Avoir le quota du jour NON rempli (todayReps < dailyTarget)
//
// Dialogues adaptés selon état :
//   - Si déjà donné → message "déjà offert"
//   - Si conditions non remplies → explique ce qui manque
//   - Si toutes remplies → offre le livre + flag treeBookGiven = true

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { addItem } from "@/lib/gamebook/inventory"
import type { InventoryEntry } from "@/lib/gamebook/inventory"
import { getTodayISO, getDailyTargetForUserOnDate } from "@/lib/challenge"
import { getTodayRepsForEnergy } from "@/lib/gamebook/energy"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const MIN_TREES_DISCOVERED = 3

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

    // Déjà donné ?
    const given = (progress as { treeBookGiven?: boolean }).treeBookGiven === true
    if (given) {
        return NextResponse.json({
            ok: true,
            alreadyGiven: true,
            message: "📗 *MIRABELLE sourit.* « Tu as déjà ton Livre. Continue d'explorer — il s'enrichit à chaque essence rencontrée. »",
        })
    }

    // Conditions de mérite
    const discoveredRaw = (progress as { treesDiscovered?: unknown }).treesDiscovered
    const treesDiscovered: string[] = Array.isArray(discoveredRaw)
        ? (discoveredRaw as unknown[]).filter((x): x is string => typeof x === "string")
        : []
    const treesCount = treesDiscovered.length

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ ok: false, reason: "User not found" }, { status: 400 })

    const today = getTodayISO()
    const todayReps = await getTodayRepsForEnergy(userId)
    const dailyTarget = getDailyTargetForUserOnDate(user, today)
    const quotaDone = todayReps >= dailyTarget

    // Cas 1 : pas assez d'arbres
    if (treesCount < MIN_TREES_DISCOVERED) {
        return NextResponse.json({
            ok: true,
            gifted: false,
            reason: "trees",
            message: `📚 *MIRABELLE te détaille du regard.* « Mmh. Tu as croisé ${treesCount} ${treesCount === 1 ? "espèce" : "espèces"} d'arbre. Pour mon Livre, il en faut au moins ${MIN_TREES_DISCOVERED}. Va observer le Nexus, puis reviens. »`,
        })
    }

    // Cas 2 : quota déjà fait → MIRABELLE refuse (= "tu travailles trop, repose tes muscles, lis un peu")
    if (quotaDone) {
        return NextResponse.json({
            ok: true,
            gifted: false,
            reason: "quota_done",
            message: `📚 *MIRABELLE croise les bras.* « Tu as déjà fait ton quota du jour (${todayReps}/${dailyTarget} reps). Tu ferais un piètre lecteur — viens quand tu auras du temps. »`,
        })
    }

    // Cas 3 : conditions remplies → don du livre
    const invRaw = (progress as { inventory?: unknown }).inventory
    const inv: InventoryEntry[] = Array.isArray(invRaw) ? (invRaw as InventoryEntry[]) : []
    const newInv = addItem(inv, "tree_book")

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { treeBookGiven: true, inventory: newInv },
    })

    return NextResponse.json({
        ok: true,
        gifted: true,
        message: "📗 *MIRABELLE te tend un livre relié de cuir.* « Tu as l'œil et la patience. Voici mon œuvre — le Livre des Arbres. Toutes les essences du Nexus s'y inscrivent à mesure que tu les rencontres. »",
    })
}
