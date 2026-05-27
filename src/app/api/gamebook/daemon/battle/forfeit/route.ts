// src/app/api/gamebook/daemon/battle/forfeit/route.ts
//
// POST — Force la fin d'un combat en cours (joueur "fuit") sans donner d'XP
// ni de récompense. Le Daemon garde son HP actuel (snapshot du combat).
//
// Cas d'usage :
//   - Combat orphelin (client crash, navigateur fermé en plein combat)
//   - Joueur qui veut abandonner volontairement (mauvais matchup)
//
// Pas de cooldown : on peut fuir n'importe quand. C'est une porte de sortie.

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

    const activeBattle = (progress as { activeBattle?: unknown }).activeBattle
    if (!activeBattle) {
        return NextResponse.json({ ok: true, alreadyEnded: true, message: "Aucun combat en cours." })
    }

    // Snapshot HP actuel sur le Daemon leader (slot 1) avant de fermer le combat
    try {
        const battle = activeBattle as { player?: { daemonId?: string; currentHp?: number } }
        const daemonId = battle.player?.daemonId
        const playerHp = typeof battle.player?.currentHp === "number" ? battle.player.currentHp : null
        if (daemonId && playerHp !== null) {
            await (prisma as any).daemon.update({
                where: { id: daemonId },
                data: { currentHp: Math.max(0, playerHp) },
            })
        }
    } catch (e) {
        console.warn("[battle/forfeit] HP snapshot failed", e)
    }

    // Ferme le combat côté progress
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { activeBattle: null as unknown as object },
    })

    return NextResponse.json({
        ok: true,
        message: "Tu prends la fuite. Aucun XP gagné. Ton Daemon garde son HP actuel.",
    })
}
