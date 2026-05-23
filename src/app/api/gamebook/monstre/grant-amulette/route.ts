// src/app/api/gamebook/monstre/grant-amulette/route.ts
//
// v3.20 — POST : le Monstre offre l'Amulette au joueur.
// Pré-requis :
//   - hasBag === true (le Monstre n'offre rien sans sac, cf. règle utilisateur)
//   - Sur la map "cave"
//   - Pas déjà d'amulette intacte dans l'inventaire (idempotent)
//
// Effet :
//   - Ajout de l'item "amulette_monstre" à l'inventaire (gift)

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isGamebookFrozen } from "@/lib/gamebook/antiCheat"
import { parseInventory, addItem, hasIntactItem } from "@/lib/gamebook/inventory"
import { getItem, getInitialItemData } from "@/lib/gamebook/items"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const AMULETTE_KEY = "amulette_monstre"

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
    if (progress.hasBag !== true) {
        return NextResponse.json({
            ok: false,
            reason: "Le Monstre te dévisage. \"Reviens quand tu auras ton sac.\"",
        })
    }
    if (progress.mapId !== "cave") {
        return NextResponse.json({ ok: false, reason: "Tu n'es pas dans la cave du Monstre." })
    }

    const currentInventory = parseInventory(progress.inventory)
    if (hasIntactItem(currentInventory, AMULETTE_KEY)) {
        return NextResponse.json({
            ok: false,
            reason: "Tu as déjà reçu l'amulette.",
        })
    }

    const def = getItem(AMULETTE_KEY)
    if (!def) {
        return NextResponse.json({ ok: false, reason: "Amulette introuvable côté serveur." }, { status: 500 })
    }
    const newInventory = addItem(currentInventory, AMULETTE_KEY, getInitialItemData(def))
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            inventory: newInventory,
            lastSeen: new Date(),
        },
    })

    return NextResponse.json({
        ok: true,
        inventory: newInventory,
        itemReceived: AMULETTE_KEY,
    })
}
