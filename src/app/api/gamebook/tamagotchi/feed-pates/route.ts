// src/app/api/gamebook/tamagotchi/feed-pates/route.ts
//
// v3.23i — POST : le joueur partage des Corned Pâtes avec son tamagotchi.
// Conditions :
//   - Sur la map "veterinaire"
//   - Tamagotchi adopté
//   - Inventory contient corned_pates
//
// Effet :
//   - Consomme 1 corned_pates de l'inventaire
//   - Marque le défi PATES (index 2) comme complété
//   - +20 happiness bonus
//   - Renvoie un commentaire de V3T

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isGamebookFrozen } from "@/lib/gamebook/antiCheat"
import { parseTamagotchi, viewTamagotchi } from "@/lib/gamebook/tamagotchi"
import { getUserLevelForGamebook } from "@/lib/gamebook/userLevel"
import { parseInventory, removeItem, hasIntactItem } from "@/lib/gamebook/inventory"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const PATES_HAPPINESS_BONUS = 20

const V3T_COMMENTS = [
    "V3T hoche la tête, ému. \"Tu lui as donné le meilleur. Il s'en souviendra.\"",
    "V3T te regarde. \"Partager ses pâtes, c'est partager son foyer. Bien joué.\"",
    "V3T : \"Ses moustaches frémissent. C'est sa façon de dire merci.\"",
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
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    if (isGamebookFrozen(progress as { gamebookFrozenUntil?: Date | null })) {
        return NextResponse.json({ ok: false, reason: "Gamebook gelé.", frozen: true })
    }
    if (progress.mapId !== "veterinaire") {
        return NextResponse.json({ ok: false, reason: "Tu n'es pas chez le vétérinaire." })
    }

    const tam = parseTamagotchi(progress.tamagotchi)
    if (!tam) {
        return NextResponse.json({ ok: false, reason: "Tu n'as pas encore adopté de tamagotchi." })
    }
    if (tam.recovered) {
        return NextResponse.json({ ok: false, reason: "Tu as déjà récupéré ton animal." })
    }

    const inventory = parseInventory(progress.inventory)
    if (!hasIntactItem(inventory, "corned_pates")) {
        return NextResponse.json({
            ok: false,
            reason: "Tu n'as pas de Corned Pâtes. Va voir TRENETTE à Macaron'île.",
        })
    }

    const newInventory = removeItem(inventory, "corned_pates", 1)

    // Marque le défi PATES (index 2) et happiness +20 bonus
    const defiProgress = { ...(tam.defiProgress ?? {}), "2": true as const }
    const newHappiness = Math.min(100, tam.happiness + PATES_HAPPINESS_BONUS)
    const updatedTam = {
        ...tam,
        defiProgress,
        happiness: newHappiness,
        lastFedAt: new Date().toISOString(),
    }

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            tamagotchi: updatedTam,
            inventory: newInventory,
            lastSeen: new Date(),
        },
    })

    const userLevel = await getUserLevelForGamebook(userId)
    const comment = V3T_COMMENTS[Math.floor(Math.random() * V3T_COMMENTS.length)]

    return NextResponse.json({
        ok: true,
        tamagotchi: viewTamagotchi(updatedTam, userLevel),
        inventory: newInventory,
        v3tComment: comment,
        defiCompleted: "PATES",
    })
}
