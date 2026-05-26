// src/app/api/gamebook/arrosoir/use/route.ts
//
// v3.24a-4 — POST : utilise l'arrosoir sur un arbre vide pour faire repousser les fruits.
//
// Body : { treeId: string }
//
// Effets :
//   - Reset fruitsTaken.counts[treeId] à 0 (= les fruits repoussent pour le joueur)
//   - Décrémente la durabilité de l'arrosoir (-1 par utilisation)
//   - Refus si arrosoir cassé / pas dans l'inventaire

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { parseInventory, hasIntactItem, wearItem } from "@/lib/gamebook/inventory"
import { ALL_TREES, TREE_KIND_CONFIGS } from "@/lib/gamebook/maps"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

interface FruitsTakenState {
    date: string
    counts: Record<string, number>
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

    const treeId = typeof body.treeId === "string" ? body.treeId : null
    const tree = treeId ? ALL_TREES.find((t) => t.id === treeId) : null
    if (!tree) {
        return NextResponse.json({ ok: false, reason: "Arbre inconnu." }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) {
        return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    }

    const inventory = parseInventory(progress.inventory)
    if (!hasIntactItem(inventory, "arrosoir")) {
        return NextResponse.json({
            ok: false,
            reason: "Tu n'as pas d'arrosoir, ou il est cassé. Va voir BASILICO ou achète-en un.",
        })
    }

    // Vérifier que l'arbre est bien vide pour ce joueur (sinon c'est inutile)
    const today = getTodayISO()
    const fruitsTakenRaw = (progress as { fruitsTaken?: unknown }).fruitsTaken
    let state: FruitsTakenState = { date: today, counts: {} }
    if (fruitsTakenRaw && typeof fruitsTakenRaw === "object" && !Array.isArray(fruitsTakenRaw)) {
        const o = fruitsTakenRaw as { date?: string; counts?: Record<string, unknown> }
        if (o.date === today && o.counts && typeof o.counts === "object") {
            const safeCounts: Record<string, number> = {}
            for (const [k, v] of Object.entries(o.counts)) {
                if (typeof v === "number" && Number.isFinite(v)) {
                    safeCounts[k] = Math.max(0, Math.floor(v))
                }
            }
            state = { date: today, counts: safeCounts }
        }
    }

    const taken = state.counts[tree.id] ?? 0
    const cfg = TREE_KIND_CONFIGS[tree.kind]
    if (taken < cfg.maxPerDay) {
        return NextResponse.json({
            ok: false,
            reason: `L'arbre a encore des fruits (${cfg.maxPerDay - taken} restants). Pas besoin d'arroser.`,
        })
    }

    // OK : reset le compteur pour cet arbre + use l'arrosoir
    const newCounts = { ...state.counts, [tree.id]: 0 }
    const newState: FruitsTakenState = { date: today, counts: newCounts }
    const newInventory = wearItem(inventory, "arrosoir", 1)

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            fruitsTaken: newState,
            inventory: newInventory,
            lastSeen: new Date(),
        },
    })

    return NextResponse.json({
        ok: true,
        message: `🪣 Tu arroses l'arbre. Les fruits repoussent ! Tu peux à nouveau cueillir ${cfg.maxPerDay} ${cfg.label.toLowerCase()}s aujourd'hui.`,
        treeId: tree.id,
        treeKind: tree.kind,
        fruitsTaken: newState,
        inventory: newInventory,
    })
}
