// src/app/api/gamebook/jardinier/check/route.ts
//
// v3.24a-4 — POST : le joueur revient voir BASILICO pour valider sa séquence.
//
// Effet :
//   - Compare progress.jardinierFruitOrder à la séquence cible
//   - Si match → grant l'arrosoir + set jardinierArrosoirGiven = true
//   - Sinon → reset fruitOrder, message d'échec (BASILICO ne révèle pas l'ordre)

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { parseInventory, addItem, hasIntactItem } from "@/lib/gamebook/inventory"
import { getInitialItemData, getItem } from "@/lib/gamebook/items"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

// Séquence cible : SECRÈTE. Le joueur doit deviner par essai-erreur.
const TARGET_SEQUENCE = ["cherry", "olive", "pear", "peach"] as const

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
            message: "BASILICO te sourit. \"Tu as déjà ton arrosoir. Va arroser.\"",
        })
    }

    const missionActive = (progress as { jardinierMissionActive?: boolean }).jardinierMissionActive === true
    if (!missionActive) {
        return NextResponse.json({
            ok: false,
            reason: "Mission non démarrée. Parle au jardinier d'abord.",
        })
    }

    const fruitOrderRaw = (progress as { jardinierFruitOrder?: unknown }).jardinierFruitOrder
    const fruitOrder = Array.isArray(fruitOrderRaw)
        ? (fruitOrderRaw as unknown[]).filter((x): x is string => typeof x === "string")
        : []

    // Check : les N premiers éléments cueillis correspondent-ils à la séquence cible ?
    const target = TARGET_SEQUENCE
    if (fruitOrder.length < target.length) {
        return NextResponse.json({
            ok: false,
            reason: `BASILICO secoue la tête. "Pas encore. Continue à cueillir, jeune pousse." (${fruitOrder.length}/${target.length})`,
            progress: fruitOrder.length,
            total: target.length,
        })
    }

    const matches = target.every((t, i) => fruitOrder[i] === t)
    if (!matches) {
        // Échec : reset pour ré-essayer
        await (prisma as any).gamebookProgress.update({
            where: { id: progress.id },
            data: { jardinierFruitOrder: [] },
        })
        return NextResponse.json({
            ok: false,
            reason: "BASILICO fronce les sourcils. \"Hmm. Ce n'est pas l'ordre que les arbres préfèrent. Recommence en cherchant mieux...\" (séquence reset)",
            failed: true,
        })
    }

    // Succès : grant l'arrosoir + flag arrosoirGiven
    const inventory = parseInventory(progress.inventory)
    let newInventory = inventory
    const arroseurDef = getItem("arrosoir")
    if (arroseurDef && !hasIntactItem(inventory, "arrosoir")) {
        newInventory = addItem(inventory, "arrosoir", getInitialItemData(arroseurDef))
    }

    // v3.37 (règle d) — +10 happiness sur défi PNJ réussi (mission jardinier)
    const { applyHappinessDelta, HAPPINESS_DELTAS } = await import("@/lib/gamebook/happinessChanges")
    const newTam = applyHappinessDelta((progress as { tamagotchi?: unknown }).tamagotchi, HAPPINESS_DELTAS.PNJ_CHALLENGE_WIN)

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            jardinierArrosoirGiven: true,
            jardinierMissionActive: false,
            jardinierFruitOrder: [],
            inventory: newInventory,
            ...(newTam ? { tamagotchi: newTam } : {}),
        },
    })

    return NextResponse.json({
        ok: true,
        success: true,
        message: "BASILICO te tend solennellement un arrosoir d'argent. \"Bravo. Les arbres t'ont jugé respectueux. Utilise-le avec parcimonie — 5 utilisations seulement.\"",
        inventory: newInventory,
    })
}
