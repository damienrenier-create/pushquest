// src/app/api/gamebook/biblio/gift-tree-book/route.ts
//
// v3.25 — POST : la bibliothécaire offre le Livre des Arbres au joueur.
// Idempotent : si treeBookGiven, retourne déjà offert.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { addItem } from "@/lib/gamebook/inventory"
import type { InventoryEntry } from "@/lib/gamebook/inventory"

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

    const given = (progress as { treeBookGiven?: boolean }).treeBookGiven === true
    if (given) {
        return NextResponse.json({
            ok: true,
            alreadyGiven: true,
            message: "« Tu as déjà ton Livre des Arbres. Ouvre-le quand tu rencontres une nouvelle espèce. »",
        })
    }

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
        message: "📗 La bibliothécaire te tend un livre relié de cuir. « Voici mon œuvre. Toutes les essences du Nexus. Va, et reviens m'en dire des nouvelles. »",
    })
}
