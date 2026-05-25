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
import { calculateAllUsersXP } from "@/lib/xp"
import { formatTimeAgo, type PlayerSnapshot } from "@/lib/gamebook/mapEngine"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

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
                },
            },
        },
    })

    // 2. Charger tous les users actifs avec leurs sets + adjustments pour calculer l'XP réelle
    // (utilisé pour animal/emoji/level — autrefois c'était une approximation /100 reps qui
    // donnait des niveaux 100 à tous les vétérans, d'où le bug d'affichage Léviathan partout.)
    const allActiveUsers = await (prisma.user as any).findMany({
        where: {
            isSystem: false,
            nickname: { not: "modo" },
        },
        include: {
            sets: true,
            xpAdjustments: true,
            badges: true,
        },
    })

    // 3. Calcul XP réel via le moteur partagé avec /api/dashboard et /api/users/list
    const badgeOwnerships = await (prisma as any).badgeOwnership.findMany()
    const allEvents = await (prisma as any).badgeEvent.findMany()
    const xpData = await calculateAllUsersXP(allActiveUsers, badgeOwnerships, undefined, allEvents)

    // Map userId → { animal, emoji, level } pour lookup rapide
    const xpByUser: Record<string, { animal: string; emoji: string; level: number }> = {}
    for (const x of xpData as Array<{ id: string; animal: string; emoji: string; level: number }>) {
        xpByUser[x.id] = { animal: x.animal, emoji: x.emoji, level: x.level }
    }

    // 4. Classement reps du jour
    // v3.23q — Cohérence avec l'énergie : 1 sec de gainage = 1/5 d'énergie (cf energy.ts).
    // Avant : 60s de gainage comptaient 60 reps → décalage entre la carte joueurs et l'énergie.
    const today = getTodayISO()
    const repsToday: Record<string, number> = {}
    for (const u of allActiveUsers as Array<{ id: string; sets: Array<{ reps: number; date: string; exercise: string }> }>) {
        const sum = u.sets
            .filter((s) => s.date === today)
            .reduce((acc: number, x: { reps: number; exercise: string }) => {
                const energyValue = x.exercise === "PLANK" ? Math.floor(x.reps / 5) : x.reps
                return acc + energyValue
            }, 0)
        repsToday[u.id] = sum
    }
    const ranking = Object.entries(repsToday)
        .filter(([, reps]) => reps > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([userId], idx) => ({ userId, rank: idx + 1 }))
    const rankByUser: Record<string, number> = {}
    for (const r of ranking) rankByUser[r.userId] = r.rank

    // 5. Construire les snapshots avec le vrai niveau XP
    const snapshots: PlayerSnapshot[] = progresses.map((p: any) => {
        const xpInfo = xpByUser[p.user.id] ?? { animal: "?", emoji: "❔", level: 1 }
        return {
            id: p.user.id,
            nickname: p.user.nickname,
            emoji: xpInfo.emoji,
            animal: xpInfo.animal,
            level: xpInfo.level,
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
