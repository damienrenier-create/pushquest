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

// v4.0 OPTIM NEON — Cache module-level des données XP (animal/emoji/level).
// Ces données ne changent que quand le joueur fait des reps ou gagne des badges.
// 60s de cache suffisent — le polling /players est lui-même à 60s+.
//
// Note Vercel : ce cache vit dans la mémoire du processus serverless. Sur cold start
// il est vide. C'est OK — au pire, la route fait 1 calcul lourd au premier hit puis
// les hits suivants pendant 60s sont gratuits.
let xpCacheData: { animal: string; emoji: string; level: number; id: string }[] | null = null
let xpCacheAt = 0
const XP_CACHE_TTL_MS = 60_000

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const currentUserId = (session.user as { id: string }).id

    // 1. Récupérer les positions des autres joueurs (SELECT minimal — au lieu des 130 colonnes).
    //    Avant : findMany incluait toutes les colonnes de GamebookProgress (5-15 KB / row).
    //    Après : 6 colonnes uniquement → ~200 octets / row.
    const progresses = await (prisma as any).gamebookProgress.findMany({
        where: {
            chapterId: CHAPTER_ID,
            userId: { not: currentUserId },
            user: {
                isSystem: false, isGuest: false,
                nickname: { not: "modo" },
            },
        },
        select: {
            mapId: true,
            posX: true,
            posY: true,
            direction: true,
            lastSeen: true,
            user: {
                select: {
                    id: true,
                    nickname: true,
                },
            },
        },
    })

    // 2. Données XP des autres joueurs : cache 60s pour éviter de recharger
    //    sets/xpAdjustments/badges/ownerships/events à chaque poll (énorme).
    const cacheHit = xpCacheData !== null && (Date.now() - xpCacheAt) < XP_CACHE_TTL_MS
    if (!cacheHit) {
        const allActiveUsers = await (prisma.user as any).findMany({
            where: {
                isSystem: false, isGuest: false,
                nickname: { not: "modo" },
            },
            include: {
                sets: true,
                xpAdjustments: true,
                badges: true,
            },
        })
        const badgeOwnerships = await (prisma as any).badgeOwnership.findMany()
        const allEvents = await (prisma as any).badgeEvent.findMany()
        const xpData = await calculateAllUsersXP(allActiveUsers, badgeOwnerships, undefined, allEvents)
        xpCacheData = (xpData as Array<{ id: string; animal: string; emoji: string; level: number }>)
            .map((x) => ({ id: x.id, animal: x.animal, emoji: x.emoji, level: x.level }))
        xpCacheAt = Date.now()
    }

    const xpByUser: Record<string, { animal: string; emoji: string; level: number }> = {}
    for (const x of xpCacheData ?? []) {
        xpByUser[x.id] = { animal: x.animal, emoji: x.emoji, level: x.level }
    }

    // 3. Classement reps du jour — requête CIBLÉE au lieu de tout recharger via user.sets.
    //    Avant : passait par les sets[] de tous les users (déjà chargés en (2), mais avec cache miss == recharge tout).
    //    Après : 1 findMany ciblé sur la date du jour avec SELECT minimal.
    // v3.23q — 1 sec de gainage = 1/5 d'énergie (cohérent avec energy.ts).
    const today = getTodayISO()
    const todaySets = await prisma.exerciseSet.findMany({
        where: { date: today },
        select: { userId: true, reps: true, exercise: true },
    })
    const repsToday: Record<string, number> = {}
    for (const s of todaySets) {
        const energyValue = s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps
        repsToday[s.userId] = (repsToday[s.userId] ?? 0) + energyValue
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
