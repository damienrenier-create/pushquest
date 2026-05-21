// src/app/api/gamebook/players/route.ts
//
// GET /api/gamebook/players
//   -> Retourne la liste de TOUS les autres joueurs (hors current user et hors system),
//      avec leur position figée (dernière sauvegarde), leur nickname, leur emoji d'animal,
//      et leur classement reps du jour (1 = top du jour).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { XP_ANIMALS } from "@/lib/xp"
import { formatTimeAgo, type PlayerSnapshot } from "@/lib/gamebook/mapEngine"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

// ============================================================
// Niveau approximatif basé sur les reps totales
// (suffisant pour afficher un emoji, pas pour de l'XP fine)
// ============================================================
function getAnimalForReps(totalReps: number): { animal: string; emoji: string; level: number } {
    // Approximation simple : 1 niveau = 100 reps cumulées historiques
    const level = Math.min(XP_ANIMALS.length, Math.max(1, Math.floor(totalReps / 100) + 1))
    const a = XP_ANIMALS[level - 1] ?? XP_ANIMALS[0]
    return { animal: a.name, emoji: a.emoji, level }
}

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const currentUserId = (session.user as { id: string }).id

    // 1. Récupérer tous les progress de la carte (CHAPTER_ID = "map_v3")
    const progresses = await prisma.gamebookProgress.findMany({
        where: {
            chapterId: CHAPTER_ID,
            userId: { not: currentUserId },
            user: {
                isSystem: false,
                nickname: { not: "modo" },
            },
        },
        include: {
            user: {
                select: {
                    id: true,
                    nickname: true,
                    sets: true,
                },
            },
        },
    })

    // 2. Calculer le classement des reps du jour pour TOUS les users actifs
    const today = getTodayISO()
    const allActiveUsers = await prisma.user.findMany({
        where: {
            isSystem: false,
            nickname: { not: "modo" },
        },
        select: {
            id: true,
            sets: {
                where: { date: today },
            },
        },
    })

    const repsToday: Record<string, number> = {}
    for (const u of allActiveUsers as Array<{ id: string; sets: Array<{ reps: number }> }>) {
        const sum = u.sets.reduce((s: number, x: { reps: number }) => s + x.reps, 0)
        repsToday[u.id] = sum
    }

    // Classement décroissant
    const ranking = Object.entries(repsToday)
        .filter(([, reps]) => reps > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([userId], idx) => ({ userId, rank: idx + 1 }))

    const rankByUser: Record<string, number> = {}
    for (const r of ranking) rankByUser[r.userId] = r.rank

    // 3. Construire les snapshots
    const snapshots: PlayerSnapshot[] = progresses.map((p: any) => {
        // Reps cumulés historiques pour le niveau (animal)
        const totalReps = p.user.sets.reduce((s: number, x: { reps: number }) => s + x.reps, 0)
        const animalInfo = getAnimalForReps(totalReps)

        return {
            id: p.user.id,
            nickname: p.user.nickname,
            emoji: animalInfo.emoji,
            animal: animalInfo.animal,
            level: animalInfo.level,
            mapId: p.mapId,
            posX: p.posX,
            posY: p.posY,
            direction: ["up", "down", "left", "right"].includes(p.direction)
                ? (p.direction as "up" | "down" | "left" | "right")
                : "down",
            lastSeenAgo: formatTimeAgo(p.lastSeen),
            todayRank: rankByUser[p.user.id],
            todayReps: repsToday[p.user.id],
        }
    })

    return NextResponse.json({ players: snapshots })
}
