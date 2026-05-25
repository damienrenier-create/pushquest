// src/app/api/gamebook/tamagotchi/drink/route.ts
//
// v3.23i — POST : le joueur donne à boire à son tamagotchi via sa gourde.
// Conditions :
//   - Sur la map "veterinaire"
//   - Tamagotchi adopté
//   - Inventory contient une flask (flask ou grande_gourde) avec stored > 0
//
// Effet :
//   - Consomme 1 unité (= 10) du stored de la gourde
//   - Marque le défi DRINK (index 1) comme complété
//   - Renvoie un commentaire de V3T

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isGamebookFrozen } from "@/lib/gamebook/antiCheat"
import { parseTamagotchi, viewTamagotchi } from "@/lib/gamebook/tamagotchi"
import { getUserLevelForGamebook } from "@/lib/gamebook/userLevel"
import { parseInventory } from "@/lib/gamebook/inventory"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const SIP_AMOUNT = 10

// Plusieurs commentaires possibles pour la variété (sélection aléatoire).
const V3T_COMMENTS = [
    "V3T sourit. \"Bien vu. Un animal hydraté, c'est un animal calme.\"",
    "V3T hoche la tête. \"L'eau avant tout. Tu apprends vite.\"",
    "V3T : \"Regarde ses yeux qui s'éclairent. La soif te dit toujours merci.\"",
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

    // Cherche une gourde avec eau
    const inventory = parseInventory(progress.inventory)
    const flaskIdx = inventory.findIndex((e) => {
        if (e.itemKey !== "flask" && e.itemKey !== "grande_gourde") return false
        const data = e.data as { stored?: number } | undefined
        const stored = typeof data?.stored === "number" ? data.stored : 0
        return stored >= SIP_AMOUNT
    })
    if (flaskIdx === -1) {
        return NextResponse.json({
            ok: false,
            reason: "Ta gourde est vide. Va la remplir au point d'eau, puis reviens.",
        })
    }

    // Décrémente le stored de la gourde
    const flaskEntry = inventory[flaskIdx]
    const data = (flaskEntry.data as { stored?: number; maxCapacity?: number } | undefined) ?? {}
    const newStored = Math.max(0, (data.stored ?? 0) - SIP_AMOUNT)
    inventory[flaskIdx] = {
        ...flaskEntry,
        data: { ...data, stored: newStored },
    }

    // Marque le défi DRINK (index 1) et happiness +5 bonus
    const defiProgress = { ...(tam.defiProgress ?? {}), "1": true as const }
    const newHappiness = Math.min(100, tam.happiness + 5)
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
            inventory,
            lastSeen: new Date(),
        },
    })

    const userLevel = await getUserLevelForGamebook(userId)
    const comment = V3T_COMMENTS[Math.floor(Math.random() * V3T_COMMENTS.length)]

    return NextResponse.json({
        ok: true,
        tamagotchi: viewTamagotchi(updatedTam, userLevel),
        inventory,
        v3tComment: comment,
        defiCompleted: "DRINK",
    })
}
